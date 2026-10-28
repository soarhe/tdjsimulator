package com.soarhe.tdj;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import android.content.*;
import android.webkit.*;
import org.junit.*;
import org.junit.runner.RunWith;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import static org.junit.Assert.*;
@RunWith(AndroidJUnit4.class)
public class ConfigurationTest {
    @Test public void configurationPageLoadsAndPersistsProfile() throws Exception {
        var i=InstrumentationRegistry.getInstrumentation();var context=i.getTargetContext();
        String before=MainActivity.config(context);
        var activity=(MainActivity)i.startActivitySync(new Intent(context,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        AtomicReference<WebView> web=new AtomicReference<>();i.runOnMainSync(()->web.set((WebView)((android.view.ViewGroup)activity.findViewById(android.R.id.content)).getChildAt(0)));
        long until=System.currentTimeMillis()+15000;boolean loaded=false;
        try {
            while(System.currentTimeMillis()<until){CountDownLatch latch=new CountDownLatch(1);AtomicReference<String> value=new AtomicReference<>();i.runOnMainSync(()->web.get().evaluateJavascript("document.querySelectorAll('.skill').length",r->{value.set(r);latch.countDown();}));assertTrue(latch.await(2,TimeUnit.SECONDS));if("1".equals(value.get())){loaded=true;break;}Thread.sleep(100);}
            assertTrue("configuration module failed to initialize",loaded);
            CountDownLatch saved=new CountDownLatch(1);
            i.runOnMainSync(()->web.get().evaluateJavascript("document.querySelector('#name').value='界面测试角色';document.querySelector('#hero').requestSubmit();",r->saved.countDown()));assertTrue(saved.await(2,TimeUnit.SECONDS));
            long deadline=System.currentTimeMillis()+3000;while(!MainActivity.config(context).contains("界面测试角色")&&System.currentTimeMillis()<deadline)Thread.sleep(50);
            assertTrue(MainActivity.config(context).contains("界面测试角色"));
            i.waitForIdleSync();Thread.sleep(400);
            var screenshot=i.getUiAutomation().takeScreenshot();if(screenshot!=null){try(var stream=new java.io.FileOutputStream(new java.io.File(context.getExternalFilesDir(null),"configuration.png"))){screenshot.compress(android.graphics.Bitmap.CompressFormat.PNG,100,stream);}screenshot.recycle();}
        } finally {context.getSharedPreferences("assistant",Context.MODE_PRIVATE).edit().putString("config",before).commit();i.runOnMainSync(activity::finish);}
    }
}
