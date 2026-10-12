import test from "node:test";
import assert from "node:assert/strict";
import {hashPassword,verifyPassword,tokenHash,validPassword} from "../src/lib/password";
import {mayOperateStation,isSameOrigin} from "../src/lib/policy";
test("passwords verify without storing raw secrets",async()=>{const a=await hashPassword("long-demo-password");const b=await hashPassword("long-demo-password");assert.notEqual(a,b);assert(await verifyPassword("long-demo-password",a));assert.equal(await verifyPassword("wrong",a),false);assert.equal(await verifyPassword("x","invalid"),false);});
test("facilitator is scoped to assignment",()=>{assert(mayOperateStation("ORGANIZER",false));assert(mayOperateStation("FACILITATOR",true));assert.equal(mayOperateStation("FACILITATOR",false),false);assert.equal(mayOperateStation("PARTICIPANT",true),false);});
test("origin rejects cross-site and missing values",()=>{assert(isSameOrigin("https://event.test","https://event.test"));assert.equal(isSameOrigin("https://evil.test","https://event.test"),false);assert.equal(isSameOrigin(null,"https://event.test"),false);});
test("token hashes are stable and password bounds enforced",()=>{assert.equal(tokenHash("abc").length,64);assert.equal(tokenHash("abc"),tokenHash("abc"));assert(validPassword("123456789012"));assert.equal(validPassword("short"),false);});
