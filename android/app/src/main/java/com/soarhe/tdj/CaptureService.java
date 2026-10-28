package com.soarhe.tdj;

import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.graphics.*;
import android.hardware.display.*;
import android.media.Image;
import android.media.ImageReader;
import android.media.projection.*;
import android.os.*;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import org.json.*;
import java.util.Locale;

public class CaptureService extends Service {
    private final Handler main=new Handler(Looper.getMainLooper());
    private HandlerThread captureThread;
    private Handler captureHandler;
    private MediaProjection projection;
    private VirtualDisplay display;
    private ImageReader reader;
    private PanelOcr ocr;
    private WebView runtime;
    private WindowManager windows;
    private LinearLayout overlay, body;
    private TextView output;
    private WindowManager.LayoutParams layout;
    private boolean runtimeReady, destroyed, expanded=true;
    private volatile boolean busy;
    private volatile long deadline, lastFrame;
    private volatile int generation;
    private long burstStart;
    private String role="auto";
    private final PanelParser.Stabilizer stabilizer=new PanelParser.Stabilizer();
    private PanelParser.Panel lastStable;
    private JSONArray currentRows=new JSONArray();
    private String lastResult="先查看我方角色，点读取；再查看敌方，点读取。";
    private final Runnable timeout=()->{
        deadline=0;generation++;
        show(lastResult+"\n\n本轮读取已结束。"+(lastStable==null?"未取得稳定面板，请保持底部面板可见后重试。":lastStable.hp()==null?"未取得气血绝对值，暂不判断击杀。":""));
    };
    private final Runnable ageTick=new Runnable(){public void run(){if(destroyed)return;if(runtimeReady&&deadline==0)runtime.evaluateJavascript("window.refresh?.()",null);main.postDelayed(this,5000);}};
    @Override public void onCreate(){
        super.onCreate();
        getSystemService(NotificationManager.class).createNotificationChannel(new NotificationChannel("capture","战斗辅助采集",NotificationManager.IMPORTANCE_LOW));
        captureThread=new HandlerThread("panel-capture");captureThread.start();captureHandler=new Handler(captureThread.getLooper());
        ocr=new PanelOcr(this);windows=getSystemService(WindowManager.class);
    }
    @Override public int onStartCommand(Intent intent,int flags,int id){
        if(intent==null || "STOP".equals(intent.getAction())){stopSelf();return START_NOT_STICKY;}
        if(projection!=null){show("助手已运行；修改配置后请停止并重新开启。");return START_NOT_STICKY;}
        PendingIntent stop=PendingIntent.getService(this,1,new Intent(this,CaptureService.class).setAction("STOP"),PendingIntent.FLAG_IMMUTABLE);
        PendingIntent open=PendingIntent.getActivity(this,2,new Intent(this,MainActivity.class),PendingIntent.FLAG_IMMUTABLE);
        Notification notification=new Notification.Builder(this,"capture").setSmallIcon(android.R.drawable.ic_menu_view).setContentTitle("天地劫助手已开启").setContentText("仅点击读取时识别；点击停止结束屏幕采集").setContentIntent(open).setOngoing(true).addAction(new Notification.Action.Builder(null,"停止",stop).build()).build();
        startForeground(1,notification,ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION);
        try{
            makeOverlay();
            runtime=LocalWeb.create(this,new Bridge());runtime.loadUrl(LocalWeb.ROOT+"runtime.html");
            Intent token=intent.getParcelableExtra("capture");
            if(token==null)throw new IllegalArgumentException("缺少屏幕采集授权");
            projection=getSystemService(MediaProjectionManager.class).getMediaProjection(intent.getIntExtra("result",Activity.RESULT_CANCELED),token);
            projection.registerCallback(new MediaProjection.Callback(){
                @Override public void onStop(){stopSelf();}
                @Override public void onCapturedContentResize(int w,int h){resize(w,h);}
                @Override public void onCapturedContentVisibilityChanged(boolean visible){
                    if(!visible){deadline=0;generation++;main.removeCallbacks(timeout);show("游戏画面不可见，已暂停读取。返回游戏后重新点击读取。");}
                }
            },main);
            Rect bounds=windows.getMaximumWindowMetrics().getBounds();
            createReader(bounds.width(),bounds.height());
            display=projection.createVirtualDisplay("TDJPanel",bounds.width(),bounds.height(),getResources().getConfiguration().densityDpi,DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,reader.getSurface(),null,captureHandler);
            main.postDelayed(ageTick,5000);
        }catch(Exception e){Toast.makeText(this,"启动失败："+e.getMessage(),Toast.LENGTH_LONG).show();stopSelf();}
        return START_NOT_STICKY;
    }
    private void createReader(int w,int h){
        reader=ImageReader.newInstance(w,h,PixelFormat.RGBA_8888,2);
        reader.setOnImageAvailableListener(this::frame,captureHandler);
    }
    private void resize(int w,int h){
        if(w<=0||h<=0||destroyed)return;
        if(reader!=null&&reader.getWidth()==w&&reader.getHeight()==h)return;
        deadline=0;generation++;main.removeCallbacks(timeout);stabilizer.reset();
        ImageReader old=reader;createReader(w,h);
        if(display!=null){display.resize(w,h,getResources().getConfiguration().densityDpi);display.setSurface(reader.getSurface());}
        if(old!=null)old.close();
        show("画面尺寸已更新，请打开底部属性面板后点读取。");
    }
    private void frame(ImageReader source){
        Image image=null;
        try{
            image=source.acquireLatestImage();if(image==null)return;
            long now=SystemClock.elapsedRealtime();
            if(deadline==0 || now>=deadline || busy || now-lastFrame<650)return;
            busy=true;lastFrame=now;final int ticket=generation;
            Image.Plane plane=image.getPlanes()[0];int w=image.getWidth(),h=image.getHeight();
            int padded=plane.getRowStride()/plane.getPixelStride();
            Bitmap raw=Bitmap.createBitmap(padded,h,Bitmap.Config.ARGB_8888);raw.copyPixelsFromBuffer(plane.getBuffer());
            Bitmap full=Bitmap.createBitmap(raw,0,0,w,h);if(full!=raw)raw.recycle();
            main.post(()->{
                if(destroyed||ticket!=generation){full.recycle();busy=false;return;}
                ocr.read(full,new PanelOcr.Callback(){
                    public void done(PanelParser.Panel panel,String diagnostics){
                        full.recycle();busy=false;
                        if(destroyed||ticket!=generation)return;
                        PanelParser.Panel stable=stabilizer.accept(panel);
                        if(stable==null){show("正在核对角色与攻防数值…\n保持底部属性面板可见，最长读取 25 秒。");return;}
                        lastStable=stable;publish(stable);
                        if(stable.hp()!=null){deadline=0;main.removeCallbacks(timeout);}
                    }
                    public void failed(String reason){full.recycle();busy=false;if(!destroyed&&ticket==generation)show(reason);}
                });
            });
        }catch(Exception e){busy=false;main.post(()->show("画面读取失败，请重新读取："+e.getMessage()));}
        finally{if(image!=null)image.close();}
    }
    private void publish(PanelParser.Panel panel){
        try{
            JSONObject json=new JSONObject().put("name",panel.name()).put("physicalAttack",panel.physicalAttack()).put("magicalAttack",panel.magicalAttack()).put("physicalDefense",panel.physicalDefense()).put("magicalDefense",panel.magicalDefense()).put("critical",panel.critical()).put("hp",panel.hp()==null?JSONObject.NULL:panel.hp()).put("maxHp",panel.maxHp()==null?JSONObject.NULL:panel.maxHp());
            runtime.evaluateJavascript("window.feed("+json+","+JSONObject.quote(role)+")",null);
        }catch(Exception e){show("计算输入异常："+e.getMessage());}
    }
    private void begin(String selectedRole){
        if(!runtimeReady){show("计算引擎尚未就绪，请稍候；若持续不就绪请检查配置。");return;}
        role=selectedRole;generation++;stabilizer.reset();lastStable=null;lastFrame=0;
        burstStart=SystemClock.elapsedRealtime();deadline=burstStart+25000;
        main.removeCallbacks(timeout);main.postDelayed(timeout,25000);
        show("读取中…\n保持当前角色面板可见；等待气血切换为绝对值。\n识别稳定后自动停止。");
    }
    private int dp(int n){return Math.round(n*getResources().getDisplayMetrics().density);}
    private Button button(String text,Runnable action){Button b=new Button(this);b.setText(text);b.setTextSize(12);b.setMinWidth(0);b.setMinimumWidth(0);b.setPadding(dp(6),0,dp(6),0);b.setOnClickListener(v->action.run());return b;}
    private void makeOverlay(){
        overlay=new LinearLayout(this);overlay.setOrientation(LinearLayout.VERTICAL);overlay.setPadding(dp(8),dp(5),dp(8),dp(6));overlay.setBackgroundColor(0xf021303e);
        TextView header=new TextView(this);header.setText("天地劫助手 · 拖动 / 点此收起");header.setTextColor(Color.rgb(128,215,194));header.setTextSize(13);header.setPadding(0,dp(8),0,dp(8));overlay.addView(header);
        body=new LinearLayout(this);body.setOrientation(LinearLayout.VERTICAL);overlay.addView(body);
        LinearLayout actions=new LinearLayout(this);actions.addView(button("读取",()->begin("auto")));actions.addView(button("同名敌方",()->begin("enemy")));actions.addView(button("停止",this::stopSelf));body.addView(actions);
        ScrollView scroll=new ScrollView(this);output=new TextView(this);output.setTextColor(Color.WHITE);output.setTextSize(13);output.setPadding(0,dp(4),0,dp(4));scroll.addView(output);body.addView(scroll,new LinearLayout.LayoutParams(-1,dp(145)));
        body.addView(button("记录实际伤害",this::recordDialog));
        layout=new WindowManager.LayoutParams(dp(285),WindowManager.LayoutParams.WRAP_CONTENT,WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,PixelFormat.TRANSLUCENT);
        layout.gravity=Gravity.TOP|Gravity.START;layout.x=dp(8);layout.y=dp(12);windows.addView(overlay,layout);
        header.setOnClickListener(v->{expanded=!expanded;body.setVisibility(expanded?View.VISIBLE:View.GONE);});
        header.setOnTouchListener(new View.OnTouchListener(){float x,y;int startX,startY;boolean moved;
            public boolean onTouch(View v,android.view.MotionEvent e){
                if(e.getAction()==MotionEvent.ACTION_DOWN){x=e.getRawX();y=e.getRawY();startX=layout.x;startY=layout.y;moved=false;return true;}
                if(e.getAction()==MotionEvent.ACTION_MOVE){float dx=e.getRawX()-x,dy=e.getRawY()-y;if(Math.abs(dx)+Math.abs(dy)>dp(6))moved=true;Rect b=windows.getCurrentWindowMetrics().getBounds();layout.x=Math.max(0,Math.min(b.width()-overlay.getWidth(),startX+(int)dx));layout.y=Math.max(0,Math.min(b.height()-dp(40),startY+(int)dy));windows.updateViewLayout(overlay,layout);return true;}
                if(e.getAction()==MotionEvent.ACTION_UP){if(!moved)v.performClick();return true;}return false;
            }});
        show(lastResult);
    }
    private void recordDialog(){
        if(currentRows.length()==0){show("请先读取双方，取得技能参考值。");return;}
        LinearLayout form=new LinearLayout(this);form.setPadding(dp(16),dp(8),dp(16),dp(8));form.setOrientation(LinearLayout.VERTICAL);
        Spinner skills=new Spinner(this);String[] names=new String[currentRows.length()];for(int i=0;i<names.length;i++)names[i]=currentRows.optJSONObject(i).optString("name");
        skills.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,names));form.addView(skills);
        EditText damage=new EditText(this);damage.setHint("本次主伤害数值");damage.setInputType(android.text.InputType.TYPE_CLASS_NUMBER);form.addView(damage);
        CheckBox crit=new CheckBox(this);crit.setText("本次暴击");form.addView(crit);
        TextView note=new TextView(this);note.setText("记录用于校准研究，不会自动当作可跨技能复用的免伤率。请确认双方状态对应本次攻击。");form.addView(note);
        AlertDialog dialog=new AlertDialog.Builder(this).setTitle("记录实际伤害").setView(form).setNegativeButton("取消",null).setPositiveButton("记录",null).create();
        dialog.getWindow().setType(WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY);
        dialog.setOnShowListener(d->dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{
            try{long n=Long.parseLong(damage.getText().toString());if(n<0)throw new NumberFormatException();runtime.evaluateJavascript("window.record("+JSONObject.quote(names[skills.getSelectedItemPosition()])+","+n+","+crit.isChecked()+")",null);dialog.dismiss();}catch(Exception e){damage.setError("请输入有效伤害");}
        }));dialog.show();
    }
    private void show(String text){if(!destroyed&&output!=null)output.setText(text);}
    public final class Bridge extends LocalWeb.Bridge {
        @JavascriptInterface public String loadConfig(){return MainActivity.config(CaptureService.this);}
        @JavascriptInterface public void ready(){main.post(()->{runtimeReady=true;show(lastResult);});}
        @JavascriptInterface public void error(String message){main.post(()->show("暂无法计算："+message));}
        @JavascriptInterface public void recorded(String json){
            main.post(()->{try{JSONObject value=new JSONObject(json);var prefs=getSharedPreferences("assistant",MODE_PRIVATE);JSONArray history=new JSONArray(prefs.getString("history","[]"));history.put(value);while(history.length()>100)history.remove(0);prefs.edit().putString("history",history.toString()).apply();show(lastResult+"\n\n已保存本次伤害记录（条件专用有效系数 "+String.format(Locale.CHINA,"%.3f",value.getDouble("effectiveFactor"))+"）。");}catch(Exception e){show("记录保存失败");}});
        }
        @JavascriptInterface public void result(String json){main.post(()->{
            try{
                JSONObject p=new JSONObject(json);currentRows=p.getJSONArray("rows");StringBuilder text=new StringBuilder();
                if(p.has("attacker"))text.append(p.getString("attacker")).append(" → ").append(p.getString("defender")).append("\n");
                if(!p.isNull("hp"))text.append("目标气血 ").append(p.optInt("hp")).append(" / ").append(p.optInt("maxHp")).append("\n");
                text.append(p.getString("message")).append("\n");
                for(int i=0;i<currentRows.length();i++){JSONObject row=currentRows.getJSONObject(i);text.append("\n").append(row.getString("name")).append("\n");if(row.has("error"))text.append(row.getString("error"));else text.append(String.format(Locale.CHINA,"参考：不暴击 %.0f / 暴击 %.0f",row.getDouble("normal"),row.getDouble("critical")));if(row.has("normalRange")){JSONArray n=row.getJSONArray("normalRange"),c=row.getJSONArray("criticalRange");text.append(String.format(Locale.CHINA,"\n假设范围：%.0f–%.0f\n暴击范围：%.0f–%.0f",n.getDouble(0),n.getDouble(1),c.getDouble(0),c.getDouble(1)));}text.append("\n");}
                if(p.has("ageMs"))text.append("\n较旧面板：").append(p.getLong("ageMs")/1000).append(" 秒前");
                lastResult=text.toString();show(lastResult+(deadline>0?"\n正在等待气血绝对值…":""));
            }catch(Exception e){show("结果解析失败："+e.getMessage());}
        });}
    }
    @Override public void onDestroy(){
        destroyed=true;deadline=0;generation++;main.removeCallbacksAndMessages(null);
        if(reader!=null){reader.setOnImageAvailableListener(null,null);reader.close();}
        if(display!=null)display.release();if(projection!=null)projection.stop();
        if(overlay!=null){try{windows.removeView(overlay);}catch(Exception ignored){}}
        if(runtime!=null)runtime.destroy();if(ocr!=null)ocr.close();if(captureThread!=null)captureThread.quitSafely();
        stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy();
    }
    @Override public IBinder onBind(Intent intent){return null;}
}
