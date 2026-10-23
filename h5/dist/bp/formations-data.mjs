// BWIKI 战阵列表 · 2026-10-23；各条件占用不同英灵，阵眼不可重复计数。
export const formationLeaders = ["赵云", "铁手夏侯仪", "哪吒", "真胤", "岭外飞燕", "关羽", "白玉堂", "幻海冥皇", "紫霆司命", "双魂虞兮", "武英仲", "连环", "古伦德", "青", "奚歌", "召祐", "慕容筝", "波旬尉迟良", "诸葛亮", "禄存高皇君", "罗渊女皇", "殷千炀", "冰蝉玉剑", "剑心无邪", "安逸", "燕赤霞", "夏侯仪", "银川公主", "四象明月", "明光剑圣", "白复归", "胧夜", "瑚儿", "双双", "于小雪", "尉迟良", "殷剑平", "天玄义剑", "剑邪", "苍狼", "幻镜胧妖", "双曜冰璃", "黎幽", "霍雍", "紫炁", "刀八", "幽寰夏侯仪", "封寒月", "妖佑宇韶容", "悟空", "魔宿霍雍", "月孛", "韩无砂", "九阴", "巴艾迩", "幽姬鹿昭依", "第二瑛", "露葵", "流舞", "阿秋", "憛香", "赤妭韩无砂", "妮可", "太玄灵狐", "赛特", "紫枫", "星占贤者", "慕容璇玑", "九色鹿", "杨戬", "计都", "傅雅鱼", "云衣宫主", "白菀", "六歧", "紫蕴", "神煌冰璃", "琴色", "天音白菀", "桑然", "陆文生", "琼枝扶桑", "李白", "景乐齐", "李逍遥", "雪芝", "允迦", "殷无邪", "韩千秀", "剑魂·天尊", "鲜于超", "暗曜阳寰", "姬穸"];
export const formations = [
  {
    "name": "七进七破阵",
    "leader": "赵云",
    "slots": [
      {
        "field": "element",
        "values": [
          "炎",
          "冰",
          "雷"
        ]
      },
      {
        "field": "element",
        "values": [
          "炎",
          "冰",
          "雷"
        ]
      }
    ],
    "condition": "赵云 + 炎/冰/雷 + 炎/冰/雷",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E4%B8%83%E8%BF%9B%E4%B8%83%E7%A0%B4%E9%98%B5"
  },
  {
    "name": "万念轮回阵",
    "leader": "铁手夏侯仪",
    "slots": [
      {
        "field": "element",
        "values": [
          "雷"
        ]
      },
      {
        "field": "element",
        "values": [
          "冰"
        ]
      }
    ],
    "condition": "铁手夏侯仪 + 雷 + 冰",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E4%B8%87%E5%BF%B5%E8%BD%AE%E5%9B%9E%E9%98%B5"
  },
  {
    "name": "三坛海会阵",
    "leader": "哪吒",
    "slots": [
      {
        "field": "element",
        "values": [
          "光"
        ]
      },
      {
        "field": "element",
        "values": [
          "幽"
        ]
      }
    ],
    "condition": "哪吒 + 光 + 幽",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E4%B8%89%E5%9D%9B%E6%B5%B7%E4%BC%9A%E9%98%B5"
  },
  {
    "name": "三身通智阵",
    "leader": "真胤",
    "slots": [
      {
        "field": "leader",
        "values": [
          "阵眼"
        ]
      },
      {
        "field": "leader",
        "values": [
          "阵眼"
        ]
      }
    ],
    "condition": "真胤 + 阵眼 + 阵眼",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E4%B8%89%E8%BA%AB%E9%80%9A%E6%99%BA%E9%98%B5"
  },
  {
    "name": "东山归鸿阵",
    "leader": "岭外飞燕",
    "slots": [
      {
        "field": "job",
        "values": [
          "御风"
        ]
      },
      {
        "field": "job",
        "values": [
          "铁卫"
        ]
      }
    ],
    "condition": "岭外飞燕 + 御风 + 铁卫",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E4%B8%9C%E5%B1%B1%E5%BD%92%E9%B8%BF%E9%98%B5"
  },
  {
    "name": "义勇无双阵",
    "leader": "关羽",
    "slots": [
      {
        "field": "job",
        "values": [
          "咒师"
        ]
      },
      {
        "field": "job",
        "values": [
          "御风"
        ]
      }
    ],
    "condition": "关羽 + 咒师 + 御风",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E4%B9%89%E5%8B%87%E6%97%A0%E5%8F%8C%E9%98%B5"
  },
  {
    "name": "义鼠夺风阵",
    "leader": "白玉堂",
    "slots": [
      {
        "field": "element",
        "values": [
          "暗"
        ]
      },
      {
        "field": "element",
        "values": [
          "炎"
        ]
      }
    ],
    "condition": "白玉堂 + 暗 + 炎",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E4%B9%89%E9%BC%A0%E5%A4%BA%E9%A3%8E%E9%98%B5"
  },
  {
    "name": "九冥煞戾阵",
    "leader": "幻海冥皇",
    "slots": [
      {
        "field": "element",
        "values": [
          "光",
          "暗",
          "幽"
        ]
      },
      {
        "field": "element",
        "values": [
          "光",
          "暗",
          "幽"
        ]
      }
    ],
    "condition": "幻海冥皇 + 光/暗/幽 + 光/暗/幽",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E4%B9%9D%E5%86%A5%E7%85%9E%E6%88%BE%E9%98%B5"
  },
  {
    "name": "九天云雷阵",
    "leader": "紫霆司命",
    "slots": [
      {
        "field": "element",
        "values": [
          "雷"
        ]
      },
      {
        "field": "element",
        "values": [
          "雷"
        ]
      }
    ],
    "condition": "紫霆司命 + 雷 + 雷",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E4%B9%9D%E5%A4%A9%E4%BA%91%E9%9B%B7%E9%98%B5"
  },
  {
    "name": "乾坤吐曜阵",
    "leader": "双魂虞兮",
    "slots": [
      {
        "field": "element",
        "values": [
          "光"
        ]
      },
      {
        "field": "element",
        "values": [
          "暗"
        ]
      }
    ],
    "condition": "双魂虞兮 + 光 + 暗",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E4%B9%BE%E5%9D%A4%E5%90%90%E6%9B%9C%E9%98%B5"
  },
  {
    "name": "乾坤流烨阵",
    "leader": "武英仲",
    "slots": [
      {
        "field": "element",
        "values": [
          "光"
        ]
      },
      {
        "field": "element",
        "values": [
          "光"
        ]
      }
    ],
    "condition": "武英仲 + 光 + 光",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E4%B9%BE%E5%9D%A4%E6%B5%81%E7%83%A8%E9%98%B5"
  },
  {
    "name": "云霭连山阵",
    "leader": "连环",
    "slots": [
      {
        "field": "gender",
        "values": [
          "女"
        ]
      },
      {
        "field": "gender",
        "values": [
          "女"
        ]
      }
    ],
    "condition": "连环 + 女 + 女",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E4%BA%91%E9%9C%AD%E8%BF%9E%E5%B1%B1%E9%98%B5"
  },
  {
    "name": "伦巴第协阵",
    "leader": "古伦德",
    "slots": [
      {
        "field": "gender",
        "values": [
          "男"
        ]
      },
      {
        "field": "gender",
        "values": [
          "男"
        ]
      }
    ],
    "condition": "古伦德 + 男 + 男",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E4%BC%A6%E5%B7%B4%E7%AC%AC%E5%8D%8F%E9%98%B5"
  },
  {
    "name": "佛口蛇心阵",
    "leader": "青",
    "slots": [
      {
        "field": "element",
        "values": [
          "雷"
        ]
      },
      {
        "field": "element",
        "values": [
          "光"
        ]
      }
    ],
    "condition": "青 + 雷 + 光",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E4%BD%9B%E5%8F%A3%E8%9B%87%E5%BF%83%E9%98%B5"
  },
  {
    "name": "侠风洗刃阵",
    "leader": "奚歌",
    "slots": [
      {
        "field": "element",
        "values": [
          "炎"
        ]
      },
      {
        "field": "element",
        "values": [
          "雷"
        ]
      }
    ],
    "condition": "奚歌 + 炎 + 雷",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E4%BE%A0%E9%A3%8E%E6%B4%97%E5%88%83%E9%98%B5"
  },
  {
    "name": "元龙两仪阵",
    "leader": "召祐",
    "slots": [
      {
        "field": "element",
        "values": [
          "炎"
        ]
      },
      {
        "field": "element",
        "values": [
          "冰"
        ]
      }
    ],
    "condition": "召祐 + 炎 + 冰",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E5%85%83%E9%BE%99%E4%B8%A4%E4%BB%AA%E9%98%B5"
  },
  {
    "name": "六天自在阵",
    "leader": "波旬尉迟良",
    "slots": [
      {
        "field": "job",
        "values": [
          "铁卫"
        ]
      },
      {
        "field": "job",
        "values": [
          "祝由"
        ]
      }
    ],
    "condition": "波旬尉迟良 + 铁卫 + 祝由",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E5%85%AD%E5%A4%A9%E8%87%AA%E5%9C%A8%E9%98%B5"
  },
  {
    "name": "六韬信战阵",
    "leader": "诸葛亮",
    "slots": [
      {
        "field": "element",
        "values": [
          "炎",
          "冰",
          "雷"
        ]
      },
      {
        "field": "element",
        "values": [
          "炎",
          "冰",
          "雷"
        ]
      }
    ],
    "condition": "诸葛亮 + 炎/冰/雷 + 炎/冰/雷",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E5%85%AD%E9%9F%AC%E4%BF%A1%E6%88%98%E9%98%B5"
  },
  {
    "name": "冰天照雪阵",
    "leader": "禄存高皇君",
    "slots": [
      {
        "field": "element",
        "values": [
          "冰"
        ]
      },
      {
        "field": "element",
        "values": [
          "冰"
        ]
      }
    ],
    "condition": "禄存高皇君 + 冰 + 冰",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E5%86%B0%E5%A4%A9%E7%85%A7%E9%9B%AA%E9%98%B5"
  },
  {
    "name": "冰火绝狱阵",
    "leader": "罗渊女皇",
    "slots": [
      {
        "field": "element",
        "values": [
          "炎"
        ]
      },
      {
        "field": "element",
        "values": [
          "冰"
        ]
      }
    ],
    "condition": "罗渊女皇 + 炎 + 冰",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E5%86%B0%E7%81%AB%E7%BB%9D%E7%8B%B1%E9%98%B5"
  },
  {
    "name": "凶星镇荒阵",
    "leader": "殷千炀",
    "slots": [
      {
        "field": "job",
        "values": [
          "咒师"
        ]
      },
      {
        "field": "job",
        "values": [
          "铁卫"
        ]
      }
    ],
    "condition": "殷千炀 + 咒师 + 铁卫",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E5%87%B6%E6%98%9F%E9%95%87%E8%8D%92%E9%98%B5"
  },
  {
    "name": "剑心凛蝉阵",
    "leader": "冰蝉玉剑",
    "slots": [
      {
        "field": "job",
        "values": [
          "御风"
        ]
      },
      {
        "field": "job",
        "values": [
          "祝由"
        ]
      }
    ],
    "condition": "冰蝉玉剑 + 御风 + 祝由",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E5%89%91%E5%BF%83%E5%87%9B%E8%9D%89%E9%98%B5"
  },
  {
    "name": "剑气凝香阵",
    "leader": "剑心无邪",
    "slots": [
      {
        "field": "gender",
        "values": [
          "女"
        ]
      },
      {
        "field": "gender",
        "values": [
          "女"
        ]
      }
    ],
    "condition": "剑心无邪 + 女 + 女",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E5%89%91%E6%B0%94%E5%87%9D%E9%A6%99%E9%98%B5"
  },
  {
    "name": "剑灼焰染阵",
    "leader": "安逸",
    "slots": [
      {
        "field": "job",
        "values": [
          "羽士"
        ]
      },
      {
        "field": "job",
        "values": [
          "祝由"
        ]
      }
    ],
    "condition": "安逸 + 羽士 + 祝由",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E5%89%91%E7%81%BC%E7%84%B0%E6%9F%93%E9%98%B5"
  },
  {
    "name": "剑胆星驰阵",
    "leader": "燕赤霞",
    "slots": [
      {
        "field": "job",
        "values": [
          "咒师"
        ]
      },
      {
        "field": "job",
        "values": [
          "祝由"
        ]
      }
    ],
    "condition": "燕赤霞 + 咒师 + 祝由",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E5%89%91%E8%83%86%E6%98%9F%E9%A9%B0%E9%98%B5"
  },
  {
    "name": "千煌幻日阵",
    "leader": "夏侯仪",
    "slots": [
      {
        "field": "name",
        "values": [
          "冰璃"
        ]
      },
      {
        "field": "name",
        "values": [
          "慕容璇玑"
        ]
      }
    ],
    "condition": "夏侯仪 + 冰璃 + 慕容璇玑",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E5%8D%83%E7%85%8C%E5%B9%BB%E6%97%A5%E9%98%B5"
  },
  {
    "name": "华日明燿阵",
    "leader": "银川公主",
    "slots": [
      {
        "field": "job",
        "values": [
          "铁卫"
        ]
      },
      {
        "field": "job",
        "values": [
          "祝由"
        ]
      }
    ],
    "condition": "银川公主 + 铁卫 + 祝由",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E5%8D%8E%E6%97%A5%E6%98%8E%E7%87%BF%E9%98%B5"
  },
  {
    "name": "华月掠影阵",
    "leader": "四象明月",
    "slots": [
      {
        "field": "element",
        "values": [
          "光"
        ]
      },
      {
        "field": "element",
        "values": [
          "雷"
        ]
      }
    ],
    "condition": "四象明月 + 光 + 雷",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E5%8D%8E%E6%9C%88%E6%8E%A0%E5%BD%B1%E9%98%B5"
  },
  {
    "name": "圣华天光阵",
    "leader": "明光剑圣",
    "slots": [
      {
        "field": "element",
        "values": [
          "光"
        ]
      },
      {
        "field": "element",
        "values": [
          "光"
        ]
      }
    ],
    "condition": "明光剑圣 + 光 + 光",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E5%9C%A3%E5%8D%8E%E5%A4%A9%E5%85%89%E9%98%B5"
  },
  {
    "name": "墨染冬月阵",
    "leader": "白复归",
    "slots": [
      {
        "field": "element",
        "values": [
          "冰"
        ]
      },
      {
        "field": "element",
        "values": [
          "暗"
        ]
      }
    ],
    "condition": "白复归 + 冰 + 暗",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E5%A2%A8%E6%9F%93%E5%86%AC%E6%9C%88%E9%98%B5"
  },
  {
    "name": "天命玄烨阵",
    "leader": "胧夜",
    "slots": [
      {
        "field": "job",
        "values": [
          "侠客"
        ]
      },
      {
        "field": "job",
        "values": [
          "祝由"
        ]
      }
    ],
    "condition": "胧夜 + 侠客 + 祝由",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E5%A4%A9%E5%91%BD%E7%8E%84%E7%83%A8%E9%98%B5"
  },
  {
    "name": "天宪引霆阵",
    "leader": "瑚儿",
    "slots": [
      {
        "field": "job",
        "values": [
          "铁卫"
        ]
      },
      {
        "field": "job",
        "values": [
          "斗将"
        ]
      }
    ],
    "condition": "瑚儿 + 铁卫 + 斗将",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E5%A4%A9%E5%AE%AA%E5%BC%95%E9%9C%86%E9%98%B5"
  },
  {
    "name": "天师明光阵",
    "leader": "双双",
    "slots": [
      {
        "field": "element",
        "values": [
          "暗"
        ]
      },
      {
        "field": "element",
        "values": [
          "雷"
        ]
      }
    ],
    "condition": "双双 + 暗 + 雷",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E5%A4%A9%E5%B8%88%E6%98%8E%E5%85%89%E9%98%B5"
  },
  {
    "name": "天恩妙雪阵",
    "leader": "于小雪",
    "slots": [
      {
        "field": "job",
        "values": [
          "侠客"
        ]
      },
      {
        "field": "job",
        "values": [
          "铁卫"
        ]
      }
    ],
    "condition": "于小雪 + 侠客 + 铁卫",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E5%A4%A9%E6%81%A9%E5%A6%99%E9%9B%AA%E9%98%B5"
  },
  {
    "name": "天烈炽炎阵",
    "leader": "殷剑平",
    "slots": [
      {
        "field": "element",
        "values": [
          "炎"
        ]
      },
      {
        "field": "element",
        "values": [
          "炎"
        ]
      }
    ],
    "condition": "殷剑平 + 炎 + 炎",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E5%A4%A9%E7%83%88%E7%82%BD%E7%82%8E%E9%98%B5"
  },
  {
    "name": "天玄义剑阵",
    "leader": "天玄义剑",
    "slots": [
      {
        "field": "element",
        "values": [
          "冰"
        ]
      },
      {
        "field": "element",
        "values": [
          "光"
        ]
      }
    ],
    "condition": "天玄义剑 + 冰 + 光",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E5%A4%A9%E7%8E%84%E4%B9%89%E5%89%91%E9%98%B5"
  },
  {
    "name": "天魔万象阵",
    "leader": "剑邪",
    "slots": [
      {
        "field": "element",
        "values": [
          "暗"
        ]
      },
      {
        "field": "element",
        "values": [
          "冰"
        ]
      }
    ],
    "condition": "剑邪 + 暗 + 冰",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E5%A4%A9%E9%AD%94%E4%B8%87%E8%B1%A1%E9%98%B5"
  },
  {
    "name": "头狼寻猎阵",
    "leader": "苍狼",
    "slots": [
      {
        "field": "job",
        "values": [
          "咒师"
        ]
      },
      {
        "field": "job",
        "values": [
          "祝由"
        ]
      }
    ],
    "condition": "苍狼 + 咒师 + 祝由",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E5%A4%B4%E7%8B%BC%E5%AF%BB%E7%8C%8E%E9%98%B5"
  },
  {
    "name": "幽使驭天阵",
    "leader": "双曜冰璃",
    "slots": [
      {
        "field": "job",
        "values": [
          "侠客"
        ]
      },
      {
        "field": "job",
        "values": [
          "祝由"
        ]
      }
    ],
    "condition": "双曜冰璃 + 侠客 + 祝由",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E5%B9%BD%E4%BD%BF%E9%A9%AD%E5%A4%A9%E9%98%B5"
  },
  {
    "name": "幽冥夜华阵",
    "leader": "黎幽",
    "slots": [
      {
        "field": "element",
        "values": [
          "暗"
        ]
      },
      {
        "field": "element",
        "values": [
          "暗"
        ]
      }
    ],
    "condition": "黎幽 + 暗 + 暗",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E5%B9%BD%E5%86%A5%E5%A4%9C%E5%8D%8E%E9%98%B5"
  },
  {
    "name": "幽寰天契阵",
    "leader": "霍雍",
    "slots": [
      {
        "field": "element",
        "values": [
          "炎"
        ]
      },
      {
        "field": "element",
        "values": [
          "冰"
        ]
      }
    ],
    "condition": "霍雍 + 炎 + 冰",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E5%B9%BD%E5%AF%B0%E5%A4%A9%E5%A5%91%E9%98%B5"
  },
  {
    "name": "幽氛万瀚阵",
    "leader": "紫炁",
    "slots": [
      {
        "field": "job",
        "values": [
          "侠客"
        ]
      },
      {
        "field": "job",
        "values": [
          "祝由"
        ]
      }
    ],
    "condition": "紫炁 + 侠客 + 祝由",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E5%B9%BD%E6%B0%9B%E4%B8%87%E7%80%9A%E9%98%B5"
  },
  {
    "name": "幽烛摄魂阵",
    "leader": "刀八",
    "slots": [
      {
        "field": "element",
        "values": [
          "光"
        ]
      },
      {
        "field": "element",
        "values": [
          "幽"
        ]
      }
    ],
    "condition": "刀八 + 光 + 幽",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E5%B9%BD%E7%83%9B%E6%91%84%E9%AD%82%E9%98%B5"
  },
  {
    "name": "幽狱伏邪阵",
    "leader": "幽寰夏侯仪",
    "slots": [
      {
        "field": "element",
        "values": [
          "幽"
        ]
      },
      {
        "field": "element",
        "values": [
          "幽"
        ]
      }
    ],
    "condition": "幽寰夏侯仪 + 幽 + 幽",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E5%B9%BD%E7%8B%B1%E4%BC%8F%E9%82%AA%E9%98%B5"
  },
  {
    "name": "弦月封霜阵",
    "leader": "封寒月",
    "slots": [
      {
        "field": "element",
        "values": [
          "冰"
        ]
      },
      {
        "field": "element",
        "values": [
          "冰"
        ]
      }
    ],
    "condition": "封寒月 + 冰 + 冰",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E5%BC%A6%E6%9C%88%E5%B0%81%E9%9C%9C%E9%98%B5"
  },
  {
    "name": "往生断厄阵",
    "leader": "妖佑宇韶容",
    "slots": [
      {
        "field": "job",
        "values": [
          "铁卫"
        ]
      },
      {
        "field": "job",
        "values": [
          "祝由"
        ]
      }
    ],
    "condition": "妖佑宇韶容 + 铁卫 + 祝由",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E5%BE%80%E7%94%9F%E6%96%AD%E5%8E%84%E9%98%B5"
  },
  {
    "name": "无量自在阵",
    "leader": "悟空",
    "slots": [
      {
        "field": "element",
        "values": [
          "冰"
        ]
      },
      {
        "field": "element",
        "values": [
          "幽"
        ]
      }
    ],
    "condition": "悟空 + 冰 + 幽",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E6%97%A0%E9%87%8F%E8%87%AA%E5%9C%A8%E9%98%B5"
  },
  {
    "name": "晦明统御阵",
    "leader": "魔宿霍雍",
    "slots": [
      {
        "field": "element",
        "values": [
          "光",
          "暗",
          "幽"
        ]
      },
      {
        "field": "element",
        "values": [
          "光",
          "暗",
          "幽"
        ]
      }
    ],
    "condition": "魔宿霍雍 + 光/暗/幽 + 光/暗/幽",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E6%99%A6%E6%98%8E%E7%BB%9F%E5%BE%A1%E9%98%B5"
  },
  {
    "name": "暗月斗灵阵",
    "leader": "月孛",
    "slots": [
      {
        "field": "job",
        "values": [
          "斗将"
        ]
      },
      {
        "field": "job",
        "values": [
          "铁卫"
        ]
      }
    ],
    "condition": "月孛 + 斗将 + 铁卫",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E6%9A%97%E6%9C%88%E6%96%97%E7%81%B5%E9%98%B5"
  },
  {
    "name": "朝花夕梦阵",
    "leader": "九阴",
    "slots": [
      {
        "field": "element",
        "values": [
          "光"
        ]
      },
      {
        "field": "element",
        "values": [
          "暗"
        ]
      }
    ],
    "condition": "九阴 + 光 + 暗",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E6%9C%9D%E8%8A%B1%E5%A4%95%E6%A2%A6%E9%98%B5"
  },
  {
    "name": "流霭绝杀阵",
    "leader": "巴艾迩",
    "slots": [
      {
        "field": "job",
        "values": [
          "咒师"
        ]
      },
      {
        "field": "job",
        "values": [
          "祝由"
        ]
      }
    ],
    "condition": "巴艾迩 + 咒师 + 祝由",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E6%B5%81%E9%9C%AD%E7%BB%9D%E6%9D%80%E9%98%B5"
  },
  {
    "name": "浊渡九寰阵",
    "leader": "幽姬鹿昭依",
    "slots": [
      {
        "field": "element",
        "values": [
          "光",
          "暗",
          "幽"
        ]
      },
      {
        "field": "element",
        "values": [
          "光",
          "暗",
          "幽"
        ]
      }
    ],
    "condition": "幽姬鹿昭依 + 光/暗/幽 + 光/暗/幽",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E6%B5%8A%E6%B8%A1%E4%B9%9D%E5%AF%B0%E9%98%B5"
  },
  {
    "name": "浑云覆山阵",
    "leader": "第二瑛",
    "slots": [
      {
        "field": "element",
        "values": [
          "暗"
        ]
      },
      {
        "field": "element",
        "values": [
          "幽"
        ]
      }
    ],
    "condition": "第二瑛 + 暗 + 幽",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E6%B5%91%E4%BA%91%E8%A6%86%E5%B1%B1%E9%98%B5"
  },
  {
    "name": "海潮升歌阵",
    "leader": "露葵",
    "slots": [
      {
        "field": "job",
        "values": [
          "铁卫"
        ]
      },
      {
        "field": "job",
        "values": [
          "祝由"
        ]
      }
    ],
    "condition": "露葵 + 铁卫 + 祝由",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E6%B5%B7%E6%BD%AE%E5%8D%87%E6%AD%8C%E9%98%B5"
  },
  {
    "name": "灵阙明灭阵",
    "leader": "流舞",
    "slots": [
      {
        "field": "element",
        "values": [
          "光",
          "暗",
          "幽"
        ]
      },
      {
        "field": "element",
        "values": [
          "光",
          "暗",
          "幽"
        ]
      }
    ],
    "condition": "流舞 + 光/暗/幽 + 光/暗/幽",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E7%81%B5%E9%98%99%E6%98%8E%E7%81%AD%E9%98%B5"
  },
  {
    "name": "灼光雷鸣阵",
    "leader": "阿秋",
    "slots": [
      {
        "field": "element",
        "values": [
          "炎"
        ]
      },
      {
        "field": "element",
        "values": [
          "光"
        ]
      }
    ],
    "condition": "阿秋 + 炎 + 光",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E7%81%BC%E5%85%89%E9%9B%B7%E9%B8%A3%E9%98%B5"
  },
  {
    "name": "焚香销魂阵",
    "leader": "憛香",
    "slots": [
      {
        "field": "job",
        "values": [
          "侠客"
        ]
      },
      {
        "field": "job",
        "values": [
          "铁卫"
        ]
      }
    ],
    "condition": "憛香 + 侠客 + 铁卫",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E7%84%9A%E9%A6%99%E9%94%80%E9%AD%82%E9%98%B5"
  },
  {
    "name": "煞蛇煌炎阵",
    "leader": "赤妭韩无砂",
    "slots": [
      {
        "field": "element",
        "values": [
          "炎"
        ]
      },
      {
        "field": "element",
        "values": [
          "炎"
        ]
      }
    ],
    "condition": "赤妭韩无砂 + 炎 + 炎",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E7%85%9E%E8%9B%87%E7%85%8C%E7%82%8E%E9%98%B5"
  },
  {
    "name": "牵灵慑魂阵",
    "leader": "妮可",
    "slots": [
      {
        "field": "job",
        "values": [
          "侠客"
        ]
      },
      {
        "field": "job",
        "values": [
          "斗将"
        ]
      }
    ],
    "condition": "妮可 + 侠客 + 斗将",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E7%89%B5%E7%81%B5%E6%85%91%E9%AD%82%E9%98%B5"
  },
  {
    "name": "狐灵神氛阵",
    "leader": "太玄灵狐",
    "slots": [
      {
        "field": "element",
        "values": [
          "炎"
        ]
      },
      {
        "field": "element",
        "values": [
          "幽"
        ]
      }
    ],
    "condition": "太玄灵狐 + 炎 + 幽",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E7%8B%90%E7%81%B5%E7%A5%9E%E6%B0%9B%E9%98%B5"
  },
  {
    "name": "玄雷淬火阵",
    "leader": "赛特",
    "slots": [
      {
        "field": "element",
        "values": [
          "暗"
        ]
      },
      {
        "field": "element",
        "values": [
          "雷"
        ]
      }
    ],
    "condition": "赛特 + 暗 + 雷",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E7%8E%84%E9%9B%B7%E6%B7%AC%E7%81%AB%E9%98%B5"
  },
  {
    "name": "琼华飞仙阵",
    "leader": "紫枫",
    "slots": [
      {
        "field": "job",
        "values": [
          "羽士"
        ]
      },
      {
        "field": "job",
        "values": [
          "祝由"
        ]
      }
    ],
    "condition": "紫枫 + 羽士 + 祝由",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E7%90%BC%E5%8D%8E%E9%A3%9E%E4%BB%99%E9%98%B5"
  },
  {
    "name": "璇光天映阵",
    "leader": "星占贤者",
    "slots": [
      {
        "field": "element",
        "values": [
          "光"
        ]
      },
      {
        "field": "element",
        "values": [
          "光"
        ]
      }
    ],
    "condition": "星占贤者 + 光 + 光",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E7%92%87%E5%85%89%E5%A4%A9%E6%98%A0%E9%98%B5"
  },
  {
    "name": "璇玑引雷阵",
    "leader": "慕容璇玑",
    "slots": [
      {
        "field": "element",
        "values": [
          "雷"
        ]
      },
      {
        "field": "element",
        "values": [
          "雷"
        ]
      }
    ],
    "condition": "慕容璇玑 + 雷 + 雷",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E7%92%87%E7%8E%91%E5%BC%95%E9%9B%B7%E9%98%B5"
  },
  {
    "name": "祝法化生阵",
    "leader": "九色鹿",
    "slots": [
      {
        "field": "job",
        "values": [
          "咒师"
        ]
      },
      {
        "field": "job",
        "values": [
          "祝由"
        ]
      }
    ],
    "condition": "九色鹿 + 咒师 + 祝由",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E7%A5%9D%E6%B3%95%E5%8C%96%E7%94%9F%E9%98%B5"
  },
  {
    "name": "神威凌曜阵",
    "leader": "杨戬",
    "slots": [
      {
        "field": "job",
        "values": [
          "御风"
        ]
      },
      {
        "field": "job",
        "values": [
          "祝由"
        ]
      }
    ],
    "condition": "杨戬 + 御风 + 祝由",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E7%A5%9E%E5%A8%81%E5%87%8C%E6%9B%9C%E9%98%B5"
  },
  {
    "name": "神曜一线阵",
    "leader": "计都",
    "slots": [
      {
        "field": "element",
        "values": [
          "炎",
          "冰",
          "雷"
        ]
      },
      {
        "field": "element",
        "values": [
          "炎",
          "冰",
          "雷"
        ]
      }
    ],
    "condition": "计都 + 炎/冰/雷 + 炎/冰/雷",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E7%A5%9E%E6%9B%9C%E4%B8%80%E7%BA%BF%E9%98%B5"
  },
  {
    "name": "神武曦舒阵",
    "leader": "傅雅鱼",
    "slots": [
      {
        "field": "gender",
        "values": [
          "男"
        ]
      },
      {
        "field": "gender",
        "values": [
          "女"
        ]
      }
    ],
    "condition": "傅雅鱼 + 男 + 女",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E7%A5%9E%E6%AD%A6%E6%9B%A6%E8%88%92%E9%98%B5"
  },
  {
    "name": "神观天掣阵",
    "leader": "云衣宫主",
    "slots": [
      {
        "field": "element",
        "values": [
          "雷"
        ]
      },
      {
        "field": "element",
        "values": [
          "光"
        ]
      }
    ],
    "condition": "云衣宫主 + 雷 + 光",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E7%A5%9E%E8%A7%82%E5%A4%A9%E6%8E%A3%E9%98%B5"
  },
  {
    "name": "笔勾神意阵",
    "leader": "六歧",
    "slots": [
      {
        "field": "job",
        "values": [
          "咒师"
        ]
      },
      {
        "field": "job",
        "values": [
          "斗将"
        ]
      }
    ],
    "condition": "六歧 + 咒师 + 斗将",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E7%AC%94%E5%8B%BE%E7%A5%9E%E6%84%8F%E9%98%B5"
  },
  {
    "name": "罗渊归誓阵",
    "leader": "神煌冰璃",
    "slots": [
      {
        "field": "element",
        "values": [
          "炎",
          "冰",
          "雷"
        ]
      },
      {
        "field": "element",
        "values": [
          "炎",
          "冰",
          "雷"
        ]
      }
    ],
    "condition": "神煌冰璃 + 炎/冰/雷 + 炎/冰/雷",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E7%BD%97%E6%B8%8A%E5%BD%92%E8%AA%93%E9%98%B5"
  },
  {
    "name": "群芳馥郁阵",
    "leader": "琴色",
    "slots": [
      {
        "field": "job",
        "values": [
          "铁卫"
        ]
      },
      {
        "field": "job",
        "values": [
          "破军"
        ]
      }
    ],
    "condition": "琴色 + 铁卫 + 破军",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E7%BE%A4%E8%8A%B3%E9%A6%A5%E9%83%81%E9%98%B5"
  },
  {
    "name": "聆音济慈阵",
    "leader": "天音白菀",
    "slots": [
      {
        "field": "element",
        "values": [
          "炎",
          "冰",
          "雷"
        ]
      },
      {
        "field": "element",
        "values": [
          "炎",
          "冰",
          "雷"
        ]
      }
    ],
    "condition": "天音白菀 + 炎/冰/雷 + 炎/冰/雷",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E8%81%86%E9%9F%B3%E6%B5%8E%E6%85%88%E9%98%B5"
  },
  {
    "name": "苍原林啸阵",
    "leader": "桑然",
    "slots": [
      {
        "field": "job",
        "values": [
          "祝由"
        ]
      },
      {
        "field": "job",
        "values": [
          "斗将"
        ]
      }
    ],
    "condition": "桑然 + 祝由 + 斗将",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E8%8B%8D%E5%8E%9F%E6%9E%97%E5%95%B8%E9%98%B5"
  },
  {
    "name": "诛恶破魔阵",
    "leader": "陆文生",
    "slots": [
      {
        "field": "element",
        "values": [
          "暗"
        ]
      },
      {
        "field": "element",
        "values": [
          "幽"
        ]
      }
    ],
    "condition": "陆文生 + 暗 + 幽",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E8%AF%9B%E6%81%B6%E7%A0%B4%E9%AD%94%E9%98%B5"
  },
  {
    "name": "贯日启明阵",
    "leader": "琼枝扶桑",
    "slots": [
      {
        "field": "element",
        "values": [
          "炎",
          "冰",
          "雷"
        ]
      },
      {
        "field": "element",
        "values": [
          "炎",
          "冰",
          "雷"
        ]
      }
    ],
    "condition": "琼枝扶桑 + 炎/冰/雷 + 炎/冰/雷",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E8%B4%AF%E6%97%A5%E5%90%AF%E6%98%8E%E9%98%B5"
  },
  {
    "name": "邀月三人阵",
    "leader": "李白",
    "slots": [
      {
        "field": "gender",
        "values": [
          "男"
        ]
      },
      {
        "field": "gender",
        "values": [
          "女"
        ]
      }
    ],
    "condition": "李白 + 男 + 女",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E9%82%80%E6%9C%88%E4%B8%89%E4%BA%BA%E9%98%B5"
  },
  {
    "name": "酌酒忘尘阵",
    "leader": "景乐齐",
    "slots": [
      {
        "field": "job",
        "values": [
          "咒师"
        ]
      },
      {
        "field": "job",
        "values": [
          "铁卫"
        ]
      }
    ],
    "condition": "景乐齐 + 咒师 + 铁卫",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E9%85%8C%E9%85%92%E5%BF%98%E5%B0%98%E9%98%B5"
  },
  {
    "name": "醉梦红尘阵",
    "leader": "李逍遥",
    "slots": [
      {
        "field": "job",
        "values": [
          "咒师"
        ]
      },
      {
        "field": "job",
        "values": [
          "御风"
        ]
      }
    ],
    "condition": "李逍遥 + 咒师 + 御风",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E9%86%89%E6%A2%A6%E7%BA%A2%E5%B0%98%E9%98%B5"
  },
  {
    "name": "问仙破御阵",
    "leader": "雪芝",
    "slots": [
      {
        "field": "job",
        "values": [
          "咒师"
        ]
      },
      {
        "field": "job",
        "values": [
          "祝由"
        ]
      }
    ],
    "condition": "雪芝 + 咒师 + 祝由",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E9%97%AE%E4%BB%99%E7%A0%B4%E5%BE%A1%E9%98%B5"
  },
  {
    "name": "附星擢升阵",
    "leader": "允迦",
    "slots": [
      {
        "field": "element",
        "values": [
          "暗"
        ]
      },
      {
        "field": "element",
        "values": [
          "雷"
        ]
      }
    ],
    "condition": "允迦 + 暗 + 雷",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E9%99%84%E6%98%9F%E6%93%A2%E5%8D%87%E9%98%B5"
  },
  {
    "name": "风花剑影阵",
    "leader": "殷无邪",
    "slots": [
      {
        "field": "gender",
        "values": [
          "女"
        ]
      },
      {
        "field": "gender",
        "values": [
          "女"
        ]
      }
    ],
    "condition": "殷无邪 + 女 + 女",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E9%A3%8E%E8%8A%B1%E5%89%91%E5%BD%B1%E9%98%B5"
  },
  {
    "name": "飞燕惊鸿阵",
    "leader": "韩千秀",
    "slots": [
      {
        "field": "job",
        "values": [
          "侠客"
        ]
      },
      {
        "field": "job",
        "values": [
          "铁卫"
        ]
      }
    ],
    "condition": "韩千秀 + 侠客 + 铁卫",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E9%A3%9E%E7%87%95%E6%83%8A%E9%B8%BF%E9%98%B5"
  },
  {
    "name": "驱雷魔魄阵",
    "leader": "剑魂·天尊",
    "slots": [
      {
        "field": "element",
        "values": [
          "雷"
        ]
      },
      {
        "field": "element",
        "values": [
          "幽"
        ]
      }
    ],
    "condition": "剑魂·天尊 + 雷 + 幽",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E9%A9%B1%E9%9B%B7%E9%AD%94%E9%AD%84%E9%98%B5"
  },
  {
    "name": "鬼冥炼狱阵",
    "leader": "鲜于超",
    "slots": [
      {
        "field": "job",
        "values": [
          "羽士"
        ]
      },
      {
        "field": "job",
        "values": [
          "咒师"
        ]
      }
    ],
    "condition": "鲜于超 + 羽士 + 咒师",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E9%AC%BC%E5%86%A5%E7%82%BC%E7%8B%B1%E9%98%B5"
  },
  {
    "name": "鬼噬御武阵",
    "leader": "暗曜阳寰",
    "slots": [
      {
        "field": "element",
        "values": [
          "冰"
        ]
      },
      {
        "field": "element",
        "values": [
          "幽"
        ]
      }
    ],
    "condition": "暗曜阳寰 + 冰 + 幽",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E9%AC%BC%E5%99%AC%E5%BE%A1%E6%AD%A6%E9%98%B5"
  },
  {
    "name": "魔犼血炼阵",
    "leader": "姬穸",
    "slots": [
      {
        "field": "element",
        "values": [
          "光"
        ]
      },
      {
        "field": "element",
        "values": [
          "暗"
        ]
      }
    ],
    "condition": "姬穸 + 光 + 暗",
    "source": "https://wiki.biligame.com/tdj/%E6%88%98%E9%98%B5/%E9%AD%94%E7%8A%BC%E8%A1%80%E7%82%BC%E9%98%B5"
  }
];
