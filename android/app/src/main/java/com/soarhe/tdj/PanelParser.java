package com.soarhe.tdj;

import java.util.*;
import java.util.regex.*;

/** Coordinates are normalized against the complete landscape game surface. */
public final class PanelParser {
    public record Word(String text, float x, float y) { }
    public record Panel(String name, Integer physicalAttack, Integer magicalAttack,
                        Integer physicalDefense, Integer magicalDefense, Integer critical,
                        Integer hp, Integer maxHp) {
        public boolean complete() { return !name.isEmpty() && physicalAttack != null && magicalAttack != null && physicalDefense != null && magicalDefense != null; }
        public String signature() { return name + ":" + physicalAttack + ":" + magicalAttack + ":" + physicalDefense + ":" + magicalDefense; }
    }
    private static String region(List<Word> words, double left, double top, double right, double bottom) {
        return words.stream().filter(w -> w.x >= left && w.x <= right && w.y >= top && w.y <= bottom)
            .sorted(Comparator.comparingDouble(Word::x)).map(Word::text).reduce("", (a,b) -> a + " " + b).trim();
    }
    private static Integer number(String text) {
        Matcher matcher = Pattern.compile("(?<![0-9])[0-9]{1,7}(?![0-9])").matcher(text.replace(" ", "").replace(",", ""));
        if (!matcher.matches()) return null;
        int value = Integer.parseInt(matcher.group());
        return value;
    }
    public static Panel parse(List<Word> words) {
        String name = region(words,.215,.806,.355,.858).replaceAll("[^\\p{IsHan}·]", "");
        String hpText = region(words,.225,.872,.36,.925).replace(" ", "").replace("／", "/").replace(",", "");
        Matcher hpMatch = Pattern.compile("([0-9]{1,7})/([0-9]{1,7})").matcher(hpText);
        Integer hp = null, max = null;
        if (hpMatch.matches()) {
            int h = Integer.parseInt(hpMatch.group(1)), m = Integer.parseInt(hpMatch.group(2));
            if (m > 0 && h <= m) { hp = h; max = m; }
        }
        return new Panel(name,
            number(region(words,.43,.806,.485,.868)), number(region(words,.545,.806,.605,.868)),
            number(region(words,.43,.872,.485,.925)), number(region(words,.545,.872,.605,.925)),
            number(region(words,.43,.932,.485,.985)), hp, max);
    }
    /** Two equal readings are needed; HP must also agree twice. Never merge across names/stats. */
    public static final class Stabilizer {
        private Panel previous;
        private Integer pendingHp, pendingMax;
        private int hpVotes;
        public void reset() { previous = null; pendingHp = pendingMax = null; hpVotes = 0; }
        public Panel accept(Panel panel) {
            if (!panel.complete()) { reset(); return null; }
            boolean same = previous != null && previous.signature().equals(panel.signature());
            if (!same) { pendingHp = pendingMax = null; hpVotes = 0; }
            if (panel.hp != null) {
                if (Objects.equals(pendingHp, panel.hp) && Objects.equals(pendingMax, panel.maxHp)) hpVotes++;
                else { pendingHp = panel.hp; pendingMax = panel.maxHp; hpVotes = 1; }
            }
            previous = panel;
            return same ? new Panel(panel.name, panel.physicalAttack, panel.magicalAttack, panel.physicalDefense, panel.magicalDefense, panel.critical, hpVotes >= 2 ? pendingHp : null, hpVotes >= 2 ? pendingMax : null) : null;
        }
    }
}
