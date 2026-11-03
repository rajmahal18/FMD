import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stationDisplayName,stationStoredName,displayStations} from '../src/lib/station-name';

test('station display removes numbered prefixes while preserving meaningful names',()=>{
 assert.equal(stationDisplayName('Station 1: Laser Grid Breach'),'Laser Grid Breach');
 assert.equal(stationDisplayName('Station 3A: Hydraulic Heist'),'Hydraulic Heist');
 assert.equal(stationDisplayName('Station #3B — Isotope Extraction'),'Isotope Extraction');
 assert.equal(stationDisplayName('Radio Station 2'),'Radio Station 2');
 assert.equal(stationDisplayName('Station 1'),'Station 1');
});

test('station sorting uses hidden numeric and letter order without changing stored data',()=>{
 const original=[{id:'10',name:'Station 10: Alpha'},{id:'3b',name:'Station 3B: Bravo'},{id:'2',name:'Station 2: Zulu'},{id:'3a',name:'Station 3A: Charlie'}];
 const displayed=displayStations(original);
 assert.deepEqual(displayed.map(s=>s.id),['2','3a','3b','10']);
 assert.deepEqual(displayed.map(s=>s.name),['Zulu','Charlie','Bravo','Alpha']);
 assert.equal(original[0].name,'Station 10: Alpha');
});

test('editing a visible name retains the original hidden station number',()=>{
 assert.equal(stationStoredName('Station 3A: Old name','New name'),'Station 3A: New name');
 assert.equal(stationStoredName('Station 3A: Old name','Station 3A: Same number'),'Station 3A: Same number');
 assert.equal(stationStoredName('Cipher Room','Signal Room'),'Signal Room');
});
