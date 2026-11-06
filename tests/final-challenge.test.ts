import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validDefusalPin} from '../src/lib/final-challenge';
test('defusal PINs preserve leading zeros and accept exactly six ASCII digits',()=>{
 for(const pin of ['000001','123456','000000'])assert(validDefusalPin(pin));
 for(const pin of [123456,'12345','1234567','123 45','12345a','１２３４５６','123456\n',null])assert(!validDefusalPin(pin));
});
