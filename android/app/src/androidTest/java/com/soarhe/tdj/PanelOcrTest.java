package com.soarhe.tdj;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import android.graphics.*;
import org.junit.*;
import org.junit.runner.RunWith;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import static org.junit.Assert.*;
@RunWith(AndroidJUnit4.class)
public class PanelOcrTest {
    private PanelParser.Panel read(String path) throws Exception {
        var instrumentation=InstrumentationRegistry.getInstrumentation();
        Bitmap bitmap;
        try(var stream=instrumentation.getContext().getAssets().open(path)){bitmap=BitmapFactory.decodeStream(stream);}
        AtomicReference<PanelParser.Panel> result=new AtomicReference<>();AtomicReference<String> error=new AtomicReference<>();CountDownLatch done=new CountDownLatch(1);
        PanelOcr ocr=new PanelOcr(instrumentation.getTargetContext());
        instrumentation.runOnMainSync(()->ocr.read(bitmap,new PanelOcr.Callback(){
            public void done(PanelParser.Panel p,String raw){android.util.Log.i("PanelOcrTest",raw+"\n"+p.toString());result.set(p);done.countDown();}
            public void failed(String reason){error.set(reason);done.countDown();}
        }));
        assertTrue("OCR exceeded 30s",done.await(30,TimeUnit.SECONDS));ocr.close();bitmap.recycle();assertNull(error.get());return result.get();
    }
    @Test public void absoluteHealthScreenshot() throws Exception {var p=read("panel-hp.jpg");assertEquals("妖佑宇韶容",p.name());assertEquals(Integer.valueOf(15984),p.hp());assertEquals(Integer.valueOf(15984),p.maxHp());assertEquals(Integer.valueOf(527),p.physicalAttack());assertEquals(Integer.valueOf(6902),p.magicalAttack());assertEquals(Integer.valueOf(2199),p.physicalDefense());assertEquals(Integer.valueOf(2173),p.magicalDefense());}
    @Test public void percentageScreenshot() throws Exception {var p=read("panel-percent.jpg");assertTrue(p.complete());assertEquals("妖佑宇韶容",p.name());assertNull(p.hp());}
}
