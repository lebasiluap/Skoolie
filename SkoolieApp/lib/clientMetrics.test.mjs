import test from 'node:test'
import assert from 'node:assert/strict'
import { clearClientMetrics, drainClientMetrics, metricOperation, recordClientMetric } from './clientMetrics.ts'

test('only allowlisted paths are measured, never arbitrary content or telemetry itself',()=>{
 assert.equal(metricOperation('/rest/v1/rpc/get_random_mcqs'),'mcq_load')
 assert.equal(metricOperation('/rest/v1/rpc/record_app_presence'),undefined)
 assert.equal(metricOperation('/anything/private'),undefined)
 assert.equal(metricOperation('/auth/v1/token'),'auth_request')
})
test('aggregates counts, failures, sum and maximum without storing samples',()=>{
 clearClientMetrics();recordClientMetric('mcq_load',100,false);recordClientMetric('mcq_load',300,true)
 assert.deepEqual(drainClientMetrics(),[{operation:'mcq_load',calls:2,failures:1,total_ms:400,max_ms:300}])
 assert.deepEqual(drainClientMetrics(),[])
})
test('caps work and ignores invalid durations',()=>{
 clearClientMetrics();recordClientMetric('profile_read',NaN,true)
 for(let i=0;i<1010;i++)recordClientMetric('profile_read',200000,false)
 const [m]=drainClientMetrics();assert.equal(m.calls,1000);assert.equal(m.max_ms,120000)
})
test('clears diagnostics across identities',()=>{
 recordClientMetric('auth_request',200,false);clearClientMetrics();assert.deepEqual(drainClientMetrics(),[])
})
