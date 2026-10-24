import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validDays, ratio, formatRate, changeLabel, toCSV } from './metrics.ts'
test('date windows are allowlisted',()=>{ assert.equal(validDays('7'),7); assert.equal(validDays('90'),90); for(const x of ['0','100000',null,NaN,[],{}]) assert.equal(validDays(x),30) })
test('unknown rates are not rendered as zero',()=>{assert.equal(ratio(0,0),null);assert.equal(formatRate(0,0),'—');assert.equal(formatRate(0,5),'0.0%');assert.equal(formatRate(2,4),'50.0%')})
test('zero baseline is not infinite growth',()=>{assert.equal(changeLabel(3,0),'No prior-period baseline');assert.equal(changeLabel(0,0),'No change (both zero)');assert.equal(changeLabel(5,10),'-50.0% vs previous period')})
test('CSV escapes values and spreadsheet formulas',()=>{assert.equal(toCSV([['=SUM(A1)', 'a"b', 'line\nbreak', null, 42]]),'"\'=SUM(A1)","a""b","line\nbreak","","42"');assert.match(toCSV([[' +cmd']]),/\'/)})
