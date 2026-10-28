package com.soarhe.tdj;
import java.util.*;
/** Only documented glyph confusions against a known roster; ambiguity never selects a hero. */
public final class NameResolver {
    private final Set<String> names;
    public NameResolver(Collection<String> names){this.names=new HashSet<>(names);}
    public String resolve(String raw){
        if(names.contains(raw))return raw;
        List<String> matches=new ArrayList<>();
        for(String known:names){
            if(known.length()!=raw.length()||raw.length()<3)continue;
            boolean compatible=true;int changed=0;
            for(int i=0;i<raw.length();i++)if(raw.charAt(i)!=known.charAt(i)){
                char a=raw.charAt(i),b=known.charAt(i);
                boolean allowed=false;
                for(String group:List.of("字宇","客容","佑祐"))if(group.indexOf(a)>=0&&group.indexOf(b)>=0)allowed=true;
                if(!allowed){compatible=false;break;}changed++;
            }
            if(compatible&&changed<=2)matches.add(known);
        }
        return matches.size()==1?matches.get(0):raw;
    }
}
