import test from "node:test";
import assert from "node:assert/strict";
import {dateOnly,timezone,color,emailAddress,roleValue,logoType} from "../src/lib/validation";
test("strict date and timezone validation",()=>{assert.equal(dateOnly(""),null);assert.equal(dateOnly("2026-10-06")?.toISOString().slice(0,10),"2026-10-06");assert.throws(()=>dateOnly("2026-02-30"));assert.throws(()=>timezone("Not/AZone"));assert.equal(timezone("Asia/Manila"),"Asia/Manila");});
test("role/email/color data rejects invalid values",()=>{assert.equal(emailAddress("Agent@Example.test"),"agent@example.test");assert.throws(()=>emailAddress("no@email"));assert.throws(()=>roleValue("SUPERADMIN"));assert.equal(color("#72D5E3"),"#72d5e3");assert.throws(()=>color("red; display:none"));});
test("logo disallows SVG and oversized content",()=>{assert.throws(()=>logoType(new Uint8Array(Buffer.from("<svg/>"))));assert.throws(()=>logoType(new Uint8Array(1024*1024+1)));assert.equal(logoType(new Uint8Array([137,80,78,71,13,10,26,10])),"image/png");});
