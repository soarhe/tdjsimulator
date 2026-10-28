package com.soarhe.tdj;

import android.graphics.*;
import android.content.Context;
import org.json.*;
import java.nio.charset.StandardCharsets;
import java.io.ByteArrayOutputStream;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.chinese.ChineseTextRecognizerOptions;
import java.util.*;

final class PanelOcr implements AutoCloseable {
    interface Callback { void done(PanelParser.Panel panel, String diagnostics); void failed(String reason); }
    private final TextRecognizer recognizer = TextRecognition.getClient(new ChineseTextRecognizerOptions.Builder().build());
    private final NameResolver names;
    PanelOcr(Context context){
        Set<String> known=new HashSet<>();
        try {
            JSONObject config=new JSONObject(MainActivity.config(context));
            JSONArray roster=config.getJSONArray("roster");
            for(int i=0;i<roster.length();i++){JSONObject hero=roster.getJSONObject(i);known.add(hero.getString("name"));JSONArray aliases=hero.optJSONArray("aliases");if(aliases!=null)for(int j=0;j<aliases.length();j++)known.add(aliases.getString(j));}
            JSONObject catalog=config.optJSONObject("catalog");if(catalog!=null)catalog.keys().forEachRemaining(known::add);
            try(var stream=context.getAssets().open("workbook.json")){JSONObject sheet=new JSONObject(readUtf8(stream)).getJSONObject("sheets").getJSONObject("数据_角色");for(int row=3;row<=1000;row++){String name=sheet.optString("B"+row,"");if(!name.isEmpty())known.add(name);}}
        }catch(Exception ignored) { }
        names=new NameResolver(known);
    }
    private static String readUtf8(java.io.InputStream stream) throws java.io.IOException {
        ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buffer=new byte[8192];int n;
        while((n=stream.read(buffer))!=-1)out.write(buffer,0,n);
        return out.toString(StandardCharsets.UTF_8.name());
    }
    // Separate fields before OCR: adjacent labels/numbers otherwise merge into a single element.
    private static final double[][] FIELDS={
        {.235,.805,.344,.864}, {.24,.875,.35,.921},
        {.448,.816,.49,.868}, {.55,.816,.605,.868},
        {.446,.874,.49,.924}, {.55,.874,.605,.924}, {.447,.932,.49,.985}
    };
    private static final float[][] CENTERS={{.29f,.838f},{.29f,.9f},{.465f,.845f},{.575f,.845f},{.465f,.9f},{.575f,.9f},{.465f,.96f}};
    static Bitmap prepare(Bitmap full) {
        int rowHeight=160,width=760;
        Bitmap montage=Bitmap.createBitmap(width,rowHeight*FIELDS.length,Bitmap.Config.ARGB_8888);
        Canvas canvas=new Canvas(montage);canvas.drawColor(Color.WHITE);Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG|Paint.FILTER_BITMAP_FLAG);
        for(int i=0;i<FIELDS.length;i++){
            double[] r=FIELDS[i];int left=(int)(r[0]*full.getWidth()),top=(int)(r[1]*full.getHeight());
            Bitmap region=Bitmap.createBitmap(full,left,top,(int)((r[2]-r[0])*full.getWidth()),(int)((r[3]-r[1])*full.getHeight()));
            if(i>0){
                // Isolate the white HP glyphs / green stat glyphs from the colored game background.
                int[] pixels=new int[region.getWidth()*region.getHeight()];region.getPixels(pixels,0,region.getWidth(),0,0,region.getWidth(),region.getHeight());
                for(int p=0;p<pixels.length;p++){
                    int red=Color.red(pixels[p]),green=Color.green(pixels[p]),blue=Color.blue(pixels[p]);
                    boolean ink=i==1 ? red>175&&green>175&&blue>175&&Math.max(red,Math.max(green,blue))-Math.min(red,Math.min(green,blue))<65 : green>110&&green>red*1.35&&green>blue*1.25;
                    pixels[p]=ink?Color.BLACK:Color.WHITE;
                }
                Bitmap mask=Bitmap.createBitmap(pixels,region.getWidth(),region.getHeight(),Bitmap.Config.ARGB_8888);region.recycle();region=mask;
            }
            float scale=Math.min((width-40f)/region.getWidth(),(rowHeight-36f)/region.getHeight());
            RectF dest=new RectF(20,i*rowHeight+18,20+region.getWidth()*scale,i*rowHeight+18+region.getHeight()*scale);
            canvas.drawBitmap(region,null,dest,paint);region.recycle();
        }
        return montage;
    }
    void read(Bitmap full, Callback callback) {
        if(full.getWidth()<full.getHeight()){callback.failed("请使用游戏横屏画面");return;}
        Bitmap montage=prepare(full);
        recognizer.process(InputImage.fromBitmap(montage,0)).addOnSuccessListener(text->{
            List<PanelParser.Word> words=new ArrayList<>();List<List<String>> rows=new ArrayList<>();for(int i=0;i<FIELDS.length;i++)rows.add(new ArrayList<>());
            for(var block:text.getTextBlocks())for(var line:block.getLines()){
                Rect box=line.getBoundingBox();if(box==null)continue;int row=(int)(box.exactCenterY()/160);
                if(row>=0&&row<FIELDS.length)rows.get(row).add(line.getText());
            }
            for(int i=0;i<FIELDS.length;i++)words.add(new PanelParser.Word(String.join("",rows.get(i)),CENTERS[i][0],CENTERS[i][1]));
            PanelParser.Panel raw=PanelParser.parse(words);
            String name=names.resolve(raw.name());
            PanelParser.Panel resolved=new PanelParser.Panel(name,raw.physicalAttack(),raw.magicalAttack(),raw.physicalDefense(),raw.magicalDefense(),raw.critical(),raw.hp(),raw.maxHp());
            callback.done(resolved,text.getText()+(name.equals(raw.name())?"":"\n名称字形校正："+raw.name()+" → "+name));
        }).addOnFailureListener(e->callback.failed("识别失败："+e.getMessage())).addOnCompleteListener(task->montage.recycle());
    }
    @Override public void close(){recognizer.close();}
}
