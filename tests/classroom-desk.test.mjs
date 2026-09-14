import test from "node:test";
import assert from "node:assert/strict";
import { THEME_CONFIGS } from "../theme-learning.js";
import { BOOK1_ITEMS } from "../data/book1.js";
import { buildThemeCatalog, ThemeLearnedStore } from "../src/theme-overview.js";
import { buildTotalWordLibrary, totalLearnedWordSet } from "../src/total-word-library.js";
const catalog = buildThemeCatalog(THEME_CONFIGS);
const key = "mario-theme-learned-v1";
test("旧 classroom:table 学习记录仍对应 desk，加载不改写存储", () => {
  for (const version of [1,2]) {
    const raw=JSON.stringify({version,learned:["classroom:table","body:head"]});
    const store=new ThemeLearnedStore(catalog,{getItem:k=>k===key?raw:null,setItem(){assert.fail("load must be read-only");}});
    assert.equal(store.has("classroom","table"),true);
    const desk=store.entries().find(x=>x.key==="classroom:table");
    assert.equal(desk.word,"desk");assert.equal(desk.phonetic,"/desk/");assert.equal(desk.chinese,"课桌");
    assert.equal(desk.art.viewBox,"765 475 365 430");
    assert.equal(store.entries().length,2);
  }
});
test("旧教室学习及复习完成状态保留，保存仅写原主题键", () => {
  const writes=[];
  const raw=JSON.stringify({version:2,learned:["classroom:table"],learnedThemes:["classroom"],reviewedThemes:["classroom"]});
  const store=new ThemeLearnedStore(catalog,{getItem:k=>k===key?raw:null,setItem:(k,v)=>writes.push([k,JSON.parse(v)])});
  assert.equal(store.isThemeLearned("classroom"),true);assert.equal(store.isThemeReviewed("classroom"),true);
  assert.equal(store.entries().length,8);store.save();
  assert.equal(writes.length,1);assert.equal(writes[0][0],key);
  assert.ok(writes[0][1].learned.includes("classroom:table"));
  assert.deepEqual(writes[0][1].reviewedThemes,["classroom"]);
});
test("课桌旧记录与 Book1 desk 合并为一个总词库条目，不新增 table", () => {
  const desk=BOOK1_ITEMS.find(x=>x.type==="word"&&x.word==="desk");
  const storage={getItem:k=>({
    [key]:JSON.stringify({version:2,learned:["classroom:table"]}),
    "mario-book1-v1":JSON.stringify({masteredIds:[desk.id]})
  })[k]||null,setItem(){assert.fail("aggregate must not write");}};
  const words=buildTotalWordLibrary(catalog,storage);
  assert.deepEqual(words.map(x=>x.word),["desk"]);
  assert.equal(words[0].key,"total:desk");
  assert.equal(words[0].sentence,"This is a desk.");
  assert.equal(words[0].art.src,"./assets/themes/classroom/classroom-things-scene-v1.png");
  assert.match(words[0].sourceLabel,/主题学习.*Book1/);
  assert.deepEqual([...totalLearnedWordSet(storage,catalog)],["desk"]);
});
