package com.soarhe.tdj;

import android.app.*;
import android.content.*;
import android.graphics.*;
import android.media.projection.MediaProjectionManager;
import android.net.Uri;
import android.os.*;
import android.provider.Settings;
import android.webkit.*;
import org.json.*;

public class MainActivity extends Activity {
    private static final int CAPTURE=10, OVERLAY=11, PHOTO=12;
    private WebView web;
    private PanelOcr ocr;
    private boolean picking;
    static final String DEFAULT_CONFIG="{\"version\":1,\"roster\":[],\"catalog\":{\"妖佑宇韶容\":\"幽\"}}";
    static String config(Context context) { return context.getSharedPreferences("assistant",MODE_PRIVATE).getString("config",DEFAULT_CONFIG); }
    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        web=LocalWeb.create(this,new Bridge());setContentView(web);
        web.setOnApplyWindowInsetsListener((v,insets)->{var bars=insets.getInsets(android.view.WindowInsets.Type.systemBars());v.setPadding(bars.left,bars.top,bars.right,bars.bottom);return insets;});
        web.loadUrl(LocalWeb.ROOT+"index.html");
        ocr=new PanelOcr(this);
    }
    private void tell(String message) { if(web!=null)web.evaluateJavascript("window.showStatus?.("+JSONObject.quote(message)+")",null); }
    private void startCapture() {
        if(!Settings.canDrawOverlays(this)) {
            tell("请允许显示在其他应用上层，返回后再次点击开启。");
            startActivityForResult(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,Uri.parse("package:"+getPackageName())),OVERLAY);return;
        }
        if(Build.VERSION.SDK_INT>=33 && checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=android.content.pm.PackageManager.PERMISSION_GRANTED)
            { requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS},13); return; }
        launchProjection();
    }
    private void launchProjection(){startActivityForResult(getSystemService(MediaProjectionManager.class).createScreenCaptureIntent(),CAPTURE);}
    @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] results){
        super.onRequestPermissionsResult(request,permissions,results);
        if(request==13)launchProjection();
    }
    @Override protected void onActivityResult(int request,int result,Intent data) {
        super.onActivityResult(request,result,data);
        if(request==CAPTURE && result==RESULT_OK && data!=null) {
            Intent service=new Intent(this,CaptureService.class).putExtra("result",result).putExtra("capture",data);
            startForegroundService(service);tell("采集已开启。切到游戏，打开底部属性面板后点悬浮窗读取。");
        } else if(request==PHOTO && result==RESULT_OK && data!=null && !picking) {
            picking=true;
            try {
                Bitmap bitmap=ImageDecoder.decodeBitmap(ImageDecoder.createSource(getContentResolver(),data.getData()),(decoder,info,source)->{
                    decoder.setAllocator(ImageDecoder.ALLOCATOR_SOFTWARE);
                    int w=info.getSize().getWidth(),h=info.getSize().getHeight();
                    if(Math.max(w,h)>3000){float scale=3000f/Math.max(w,h);decoder.setTargetSize((int)(w*scale),(int)(h*scale));}
                });
                ocr.read(bitmap,new PanelOcr.Callback(){
                    public void done(PanelParser.Panel p,String text){
                        String report="角色："+p.name()+"\n物攻 "+p.physicalAttack()+" / 法攻 "+p.magicalAttack()+"\n物防 "+p.physicalDefense()+" / 法防 "+p.magicalDefense()+"\n气血 "+p.hp()+" / "+p.maxHp()+"\n会心 "+p.critical()+"\n\n原始识别：\n"+text;
                        if(web!=null)web.evaluateJavascript("window.showDiagnostics?.("+JSONObject.quote(report)+")",null);
                        bitmap.recycle();picking=false;
                    }
                    public void failed(String reason){tell(reason);bitmap.recycle();picking=false;}
                });
            } catch(Exception e){picking=false;tell("无法读取图片："+e.getMessage());}
        }
    }
    public final class Bridge extends LocalWeb.Bridge {
        @JavascriptInterface public String loadConfig(){return config(MainActivity.this);}
        @JavascriptInterface public String loadHistory(){return getSharedPreferences("assistant",MODE_PRIVATE).getString("history","[]");}
        @JavascriptInterface public void saveConfig(String json){
            try{JSONObject obj=new JSONObject(json);if(obj.getInt("version")!=1||json.length()>1_000_000)throw new IllegalArgumentException();
                getSharedPreferences("assistant",MODE_PRIVATE).edit().putString("config",json).apply();
            }catch(Exception e){runOnUiThread(()->tell("配置保存失败"));}
        }
        @JavascriptInterface public void startCapture(){runOnUiThread(()->MainActivity.this.startCapture());}
        @JavascriptInterface public void stopCapture(){runOnUiThread(()->{stopService(new Intent(MainActivity.this,CaptureService.class));tell("采集已停止，本场缓存已清除。");});}
        @JavascriptInterface public void pickImage(){runOnUiThread(()->{Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("image/*").addCategory(Intent.CATEGORY_OPENABLE);startActivityForResult(i,PHOTO);});}
    }
    @Override protected void onDestroy(){if(ocr!=null)ocr.close();if(web!=null){web.destroy();web=null;}super.onDestroy();}
}
