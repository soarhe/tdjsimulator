package com.soarhe.tdj;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import android.webkit.*;
import android.os.*;
import org.junit.*;
import org.junit.runner.RunWith;
import org.json.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import static org.junit.Assert.*;
@RunWith(AndroidJUnit4.class)
public class RuntimeTest {
    @Test public void offlineWebViewRunsSharedEngine() throws Exception {
        var instrumentation=InstrumentationRegistry.getInstrumentation();
        AtomicReference<WebView> view=new AtomicReference<>();AtomicReference<String> output=new AtomicReference<>();AtomicReference<String> error=new AtomicReference<>();CountDownLatch done=new CountDownLatch(1);
        LocalWeb.Bridge bridge=new LocalWeb.Bridge(){
            @JavascriptInterface public String loadConfig(){return "{\"version\":1,\"roster\":[{\"name\":\"我方\",\"element\":\"幽\",\"skills\":[{\"name\":\"测试\",\"type\":\"法\",\"multiplier\":1.5,\"pierce\":0.2,\"a\":0.1,\"b\":0.2,\"c\":0,\"criticalBonus\":0.1,\"elementBonus\":0}]}],\"catalog\":{\"妖佑宇韶容\":\"幽\"}}";}
            @JavascriptInterface public void ready(){new Handler(Looper.getMainLooper()).post(()->view.get().evaluateJavascript("window.feed({name:'我方',physicalAttack:1000,magicalAttack:7000,physicalDefense:1000,magicalDefense:1000,hp:10000,maxHp:10000},'auto');window.feed({name:'妖佑宇韶容',physicalAttack:527,magicalAttack:6902,physicalDefense:2199,magicalDefense:2173,hp:15984,maxHp:15984},'auto');",null));}
            @JavascriptInterface public void result(String json){try{if(new JSONObject(json).getJSONArray("rows").length()>0){output.set(json);done.countDown();}}catch(Exception e){error.set(e.toString());done.countDown();}}
            @JavascriptInterface public void error(String message){error.set(message);done.countDown();}
        };
        instrumentation.runOnMainSync(()->{view.set(LocalWeb.create(instrumentation.getTargetContext(),bridge));view.get().loadUrl(LocalWeb.ROOT+"runtime.html");});
        boolean finished=done.await(30,TimeUnit.SECONDS);
        instrumentation.runOnMainSync(()->view.get().destroy());
        assertTrue("Runtime startup exceeded 30s",finished);assertNull(error.get());JSONObject result=new JSONObject(output.get());assertEquals(15984,result.getInt("hp"));assertEquals((7000-2173*.8)*1.1*1.3*1.5,result.getJSONArray("rows").getJSONObject(0).getDouble("normal"),.001);
    }
}
