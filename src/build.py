import json, subprocess, pathlib
d = pathlib.Path('.')
t = (d/'template.html').read_text()
def rd(n): return (d/n).read_text().replace("'use strict';\n", "", 1)
for ph, f in [('/*DATA*/','data.js'),('/*DATA2*/','data_v2.js'),('/*DATAADV*/','data_advice.js'),('/*ENGINE*/','engine.js'),('/*ADVICE*/','advice.js'),('/*WEATHER*/','weather.js'),('/*STORE*/','store.js'),('/*UICORE*/','ui_core.js'),('/*UIRENDER*/','ui_render.js'),('/*UICARE*/','ui_care.js'),('/*UITREES*/','ui_trees.js'),('/*UISITE*/','ui_site.js'),('/*UICUSTOM*/','ui_custom.js'),('/*UIADVICE*/','ui_advice.js')]:
    t = t.replace(ph, rd(f))
out = d/'dist'; out.mkdir(exist_ok=True)
(out/'index.html').write_text(t)
# outlook.json from data.js OUTLOOK
js = "const fs=require('fs');const vm=require('vm');const c={};vm.createContext(c);vm.runInContext(fs.readFileSync('data.js','utf8')+';this.O=OUTLOOK;',c);console.log(JSON.stringify(c.O,null,2));"
o = subprocess.run(['node','-e',js],capture_output=True,text=True,check=True).stdout
(out/'outlook.json').write_text(o)
print('built', len(t)//1024, 'KB')
