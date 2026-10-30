import test from 'node:test';
import assert from 'node:assert/strict';
import {squadRoles,squadRoleValue} from '../src/lib/squad-roles';

test('squad duties cannot be used to assign authentication roles',()=>{
 assert.equal(squadRoleValue(''),null);
 for(const role of squadRoles)assert.equal(squadRoleValue(role),role);
 for(const role of ['ORGANIZER','FACILITATOR','PARTICIPANT','Administrator']){
  assert.throws(()=>squadRoleValue(role),/valid squad role/);
 }
});
