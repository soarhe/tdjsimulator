// Small, deterministic interpreter for the formulas used by the source workbook.
// No eval / Function: imported cell contents never execute JavaScript.
const col = s => [...s].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0);
const addr = (r,c) => { let s='';for(;c;c=Math.floor((c-1)/26))s=String.fromCharCode(65+(c-1)%26)+s;return s+r; };
const split = a => {const m=a.replaceAll('$','').match(/^([A-Z]+)(\d+)$/);return [+m[2],col(m[1])];};
const flatten = a => a.flat(Infinity);
const number = x => {if(x==null||x==='')return 0;const n=Number(x);if(!Number.isFinite(n))throw Error('非数值');return n;};
export class Engine {
 constructor(data, overrides={}, corrected=false){this.data=data;this.overrides=overrides;this.corrected=corrected;this.memo=new Map();this.asts=new Map();this.active=new Set();}
 reset(overrides=this.overrides,corrected=this.corrected){this.overrides=overrides;this.corrected=corrected;this.memo.clear();}
 cell(sheet,a){a=a.replaceAll('$','');const key=sheet+'!'+a;if(this.memo.has(key))return this.memo.get(key);if(this.active.has(key))throw Error('循环引用 '+key);this.active.add(key);try{
 let v=this.overrides[key]??this.data.sheets[sheet]?.[a]??null;
 if(this.corrected){
  if(key==='工作台1!D24'){let attack=this.cell(sheet,'B3'),defend=this.cell(sheet,'B29');const elements=['雷','冰','炎','光','暗','幽','神','魔'];v=this.cell('数据_克制',addr(elements.indexOf(attack)+2,elements.indexOf(defend)+2));}
  if(key==='工作台1!L51')v='=SUM(L31:L47,L50)';
  if(sheet==='排行计算1'&&/^V\d+$/.test(a))v='=工作台1!L51';
  if(key==='工作台1!V3')v='=IF(P5>=B51,"击杀","未击杀")';
  if(key==='工作台1!V7')v='=IF(P9>=B51,"击杀","未击杀")';
 }
 const value=typeof v==='string'&&v.startsWith('=')&&v.length>1?this.evaluate(v,sheet,a):v;this.memo.set(key,value);return value;
 }finally{this.active.delete(key);}}
 range(sheet,ref){let [start,end=start]=ref.split(':');const [r1,c1]=split(start),[r2,c2]=split(end);const rows=[];for(let r=r1;r<=r2;r++){let row=[];for(let c=c1;c<=c2;c++)row.push(this.cell(sheet,addr(r,c)));rows.push(row);}return rows;}
 parse(formula){if(this.asts.has(formula))return this.asts.get(formula);const tokens=formula.slice(1).match(/"(?:[^"]|"")*"|'[^']*'|\d+(?:\.\d+)?|>=|<=|<>|[A-Za-z_$\u0080-\uFFFF][A-Za-z_0-9.$\u0080-\uFFFF]*|[()+*\/,!:=<>-]/g)||[];let i=0;
 const precedence={'=':1,'>':1,'<':1,'>=':1,'<=':1,'<>':1,'+':2,'-':2,'*':3,'/':3};
 const expression=(min=0)=>{let t=tokens[i++],node;if(t==='('){node=expression();if(tokens[i++]!==')')throw Error('括号');}else if(t==='-'||t==='+')node={unary:t,arg:expression(4)};else if(t?.startsWith('"'))node={literal:t.slice(1,-1).replaceAll('""','"')};else if(/^\d/.test(t))node={literal:Number(t)};else if(tokens[i]==='('){i++;let args=[];if(tokens[i]!==')'){do{args.push(expression());if(tokens[i]!==',')break;i++;}while(true);}if(tokens[i++]!==')')throw Error('函数括号');node={fn:t,args};}else{let sheet=null,ref=t;if(tokens[i]==='!'){i++;sheet=t.replace(/^'|'$/g,'');ref=tokens[i++];}if(tokens[i]===':'){i++;ref+=':'+tokens[i++];}node={ref,sheet};}while(precedence[tokens[i]]>=min){let op=tokens[i++];node={op,left:node,right:expression(precedence[op]+1)};}return node;};
 const tree=expression();if(i!==tokens.length)throw Error('不支持的公式 '+formula);this.asts.set(formula,tree);return tree;}
 evaluate(formula,sheet,cell){return this.run(this.parse(formula),sheet,cell);}
 run(n,sheet,cell){const run=x=>this.run(x,sheet,cell);if('literal'in n)return n.literal;if(n.unary)return number(run(n.arg))*(n.unary==='-'?-1:1);
 if(n.ref){if(this.data.names[n.ref]){const [s,r]=this.data.names[n.ref].split('!');return this.range(s,r);}return n.ref.includes(':')?this.range(n.sheet||sheet,n.ref):this.cell(n.sheet||sheet,n.ref);}
 if(n.op){const a=run(n.left),b=run(n.right);switch(n.op){case '+':return number(a)+number(b);case '-':return number(a)-number(b);case '*':return number(a)*number(b);case '/':if(number(b)===0)throw Error('除零');return number(a)/number(b);case '=':return a==b;case '<>':return a!=b;case '>':return a>b;case '<':return a<b;case '>=':return a>=b;case '<=':return a<=b;}}
 if(n.fn==='IF')return run(n.args[0])?run(n.args[1]):run(n.args[2]);if(n.fn==='IFERROR'){try{return run(n.args[0]);}catch{return run(n.args[1]);}}
 const args=n.args.map(run),flat=flatten(args);switch(n.fn){
 case 'OR':return flat.some(Boolean);case 'ISBLANK':return args[0]==null;
 case 'SUM':return flat.reduce((s,v)=>s+(typeof v==='number'?v:0),0);
 case 'MAX':return Math.max(...flat.filter(v=>typeof v==='number'));
 case 'ROUND':{const scale=10**args[1],x=args[0]*scale;return Math.sign(x)*Math.round(Math.abs(x)+1e-10)/scale;}
 case 'ROW':return split(cell)[0];
 case 'VLOOKUP':{const row=args[1].find(r=>r[0]===args[0]);if(!row)throw Error('未找到 '+args[0]);return row[args[2]-1]??0;}
 case 'SUMIFS':{const values=flatten(args[0]),criteria=[];for(let j=1;j<args.length;j+=2)criteria.push([flatten(args[j]),args[j+1]]);let sum=0;for(let i=0;i<values.length;i++)if(criteria.every(([range,value])=>range[i]===value))sum+=number(values[i]);return sum;}
 case 'SUMIF':return flatten(args[0]).reduce((sum,v,i)=>sum+(v===args[1]?number(flatten(args[2])[i]):0),0);
 case 'COUNTIF':return flatten(args[0]).filter(v=>v===args[1]).length;
 case 'INDEX':{const r=args[0][args[1]-1];if(!r)throw Error('索引越界');const v=r[(args[2]??1)-1];if(v===undefined)throw Error('索引越界');return v??0;}
 case 'MATCH':{const list=flatten(args[1]);const index=args[2]===0?list.indexOf(args[0]):list.findLastIndex(v=>v!=null&&v<=args[0]);if(index<0)throw Error('未匹配');return index+1;}
 case 'LOOKUP':{const i=flatten(args[1]).findLastIndex(v=>v!=null&&v<=args[0]);if(i<0)throw Error('下界未匹配');return flatten(args[2])[i];}
 case 'RANK':return 1+flatten(args[1]).filter(v=>args[2]===1?v<args[0]:v>args[0]).length;
 default:throw Error('未支持函数 '+n.fn);}
 }
}
export const defaults = () => ({});
