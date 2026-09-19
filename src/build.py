#!/usr/bin/env python3
"""Rebuild ../index.html and ../outlook.json from the source files in this folder.
Usage:  cd src && python3 build.py      (needs Python 3 and Node.js)"""
import subprocess, pathlib
d = pathlib.Path(__file__).parent
out = d.parent
t = (d / 'template.html').read_text()
def rd(n): return (d / n).read_text().replace("'use strict';\n", "", 1)
for ph, f in [('/*DATA*/','data.js'),('/*ENGINE*/','engine.js'),('/*WEATHER*/','weather.js'),('/*UICORE*/','ui_core.js'),('/*UIRENDER*/','ui_render.js')]:
    t = t.replace(ph, rd(f))
(out / 'index.html').write_text(t)
js = "const fs=require('fs');const vm=require('vm');const c={};vm.createContext(c);vm.runInContext(fs.readFileSync('data.js','utf8')+';this.O=OUTLOOK;',c);console.log(JSON.stringify(c.O,null,2));"
(out / 'outlook.json').write_text(subprocess.run(['node','-e',js],cwd=d,capture_output=True,text=True,check=True).stdout)
print('built index.html and outlook.json')
