package com.soarhe.tdj;
import org.junit.Test;
import java.util.*;
import static org.junit.Assert.*;
public class NameResolverTest {
 @Test public void resolvesKnownGlyphConfusions(){assertEquals("妖佑宇韶容",new NameResolver(List.of("妖佑宇韶容")).resolve("妖佑字韶客"));}
 @Test public void doesNotGuessUnknownCharacters(){assertEquals("妖佑冰韶容",new NameResolver(List.of("妖佑宇韶容")).resolve("妖佑冰韶容"));}
 @Test public void ambiguityPreservesRawText(){assertEquals("妖佑字韶客",new NameResolver(List.of("妖佑宇韶容","妖佑字韶容")).resolve("妖佑字韶客"));}
}
