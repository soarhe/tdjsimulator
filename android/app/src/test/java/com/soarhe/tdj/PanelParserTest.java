package com.soarhe.tdj;
import org.junit.Test;
import static org.junit.Assert.*;
import java.util.*;
public class PanelParserTest {
    private List<PanelParser.Word> words(String name,String hp){return List.of(
        new PanelParser.Word("70 "+name,.29f,.838f),new PanelParser.Word("527",.465f,.845f),
        new PanelParser.Word("6902",.575f,.845f),new PanelParser.Word("2199",.465f,.9f),
        new PanelParser.Word("2173",.575f,.9f),new PanelParser.Word("193",.465f,.96f),new PanelParser.Word(hp,.29f,.9f));}
    @Test public void readsScreenshotNumbers(){var p=PanelParser.parse(words("妖佑宇韶容","15984/15984"));assertEquals("妖佑宇韶容",p.name());assertEquals(Integer.valueOf(527),p.physicalAttack());assertEquals(Integer.valueOf(6902),p.magicalAttack());assertEquals(Integer.valueOf(2199),p.physicalDefense());assertEquals(Integer.valueOf(2173),p.magicalDefense());assertEquals(Integer.valueOf(15984),p.hp());}
    @Test public void percentIsNotAbsoluteHealth(){assertNull(PanelParser.parse(words("甲","100%")).hp());}
    @Test public void invalidHealthRejected(){assertNull(PanelParser.parse(words("甲","200/100")).hp());}
    @Test public void requiresTwoReadingsForStatsAndHp(){var s=new PanelParser.Stabilizer();var percent=PanelParser.parse(words("甲","100%"));var hp=PanelParser.parse(words("甲","15984/15984"));assertNull(s.accept(percent));assertNull(s.accept(hp).hp());assertEquals(Integer.valueOf(15984),s.accept(hp).hp());}
    @Test public void targetSwitchCannotInheritHealth(){var s=new PanelParser.Stabilizer();var a=PanelParser.parse(words("甲","15984/15984"));s.accept(a);s.accept(a);assertNull(s.accept(PanelParser.parse(words("乙","100%"))));assertNull(s.accept(PanelParser.parse(words("乙","100%"))).hp());}
    @Test public void incompleteFrameBreaksConsensus(){var s=new PanelParser.Stabilizer();var a=PanelParser.parse(words("甲","100%"));s.accept(a);s.accept(PanelParser.parse(List.of()));assertNull(s.accept(a));}
}
