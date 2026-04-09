/**
 * Performance Testing Script for Face Verification API
 * Run with: node scripts/performance-test.js
 */

import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_IMAGE = process.env.TEST_IMAGE || './test-image.jpg';
const NUM_REQUESTS = parseInt(process.env.NUM_REQUESTS, 10) || 100;
const CONCURRENT_REQUESTS = parseInt(process.env.CONCURRENT, 10) || 10;
const EVENT_ID = process.env.EVENT_ID || '66148a2c1b2c3d4e5f6g7h8i';

const results = {
  totalRequests: 0,
  successRequests: 0,
  failedRequests: 0,
  totalTime: 0,
  responseTimes: [],
  errors: [],
};

async function makeRequest() {
  try {
    const formData = new FormData();
    formData.append('image', fs.createReadStream(TEST_IMAGE));
    formData.append('eventId', EVENT_ID);

    const startTime = Date.now();

    const response = await axios.post(`${API_URL}/api/face-verify`, formData, {
      headers: formData.getHeaders(),
      timeout: 5000,
    });

    const duration = Date.now() - startTime;

    results.responseTimes.push(duration);
    results.successRequests++;
    results.totalTime += duration;

    return {
      success: true,
      duration,
      data: response.data,
    };
  } catch (error) {
    results.failedRequests++;
    results.errors.push(error.message);

    return {
      success: false,
      error: error.message,
    };
  }

  results.totalRequests++;
}

async function runConcurrentBatch(batchSize) {
  const promises = [];
  for (let i = 0; i < batchSize; i++) {
    promises.push(makeRequest());
  }
  return Promise.all(promises);
}

async function runPerformanceTest() {
  console.log('🚀 Starting Performance Test');
  console.log(`📊 Configuration:`);
  console.log(`   - Total Requests: ${NUM_REQUESTS}`);
  console.log(`   - Concurrent: ${CONCURRENT_REQUESTS}`);
  console.log(`   - API URL: ${API_URL}`);
  console.log(`   - Test Image: ${TEST_IMAGE}`);
  console.log(`   - Event ID: ${EVENT_ID}`);
  console.log('');

  // Verify test image exists
  if (!fs.existsSync(TEST_IMAGE)) {
    console.error(`❌ Test image not found: ${TEST_IMAGE}`);
    process.exit(1);
  }

  const totalBatches = Math.ceil(NUM_REQUESTS / CONCURRENT_REQUESTS);
  const startTime = Date.now();

  for (let batch = 0; batch < totalBatches; batch++) {
    const batchSize = Math.min(
      CONCURRENT_REQUESTS,
      NUM_REQUESTS - batch * CONCURRENT_REQUESTS
    );

    process.stdout.write(
      `\r📈 Progress: ${batch * CONCURRENT_REQUESTS + batchSize}/${NUM_REQUESTS}`
    );

    await runConcurrentBatch(batchSize);
  }

  const totalDuration = Date.now() - startTime;
  results.totalRequests = NUM_REQUESTS;

  console.log('\n\n✅ Performance Test Complete\n');

  // Calculate statistics
  const avgResponseTime = results.responseTimes.length
    ? Math.round(results.responseTimes.reduce((a, b) => a + b, 0) /
        results.responseTimes.length)
    : 0;

  const minResponseTime = results.responseTimes.length
    ? Math.min(...results.responseTimes)
    : 0;

  const maxResponseTime = results.responseTimes.length
    ? Math.max(...results.responseTimes)
    : 0;

  const sortedTimes = [...results.responseTimes].sort((a, b) => a - b);
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];

  const successRate = Math.round(
    (results.successRequests / results.totalRequests) * 100
  );

  const requestsPerSecond = Math.round((NUM_REQUESTS / totalDuration) * 1000);

  console.log('📊 Results:\n');
  console.log('Success Metrics:');
  console.log(
    `  ✓ Successful: ${results.successRequests}/${results.totalRequests}`
  );
  console.log(`  ✓ Success Rate: ${successRate}%`);
  console.log(`  ✓ Failed: ${results.failedRequests}`);
  console.log('');

  console.log('Response Time Metrics:');
  console.log(`  ⏱️  Average: ${avgResponseTime}ms`);
  console.log(`  ⏱️  Min: ${minResponseTime}ms`);
  console.log(`  ⏱️  Max: ${maxResponseTime}ms`);
  console.log(`  ⏱️  P95: ${p95}ms`);
  console.log(`  ⏱️  P99: ${p99}ms`);
  console.log('');

  console.log('Throughput Metrics:');
  console.log(`  🏃 Total Time: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
  console.log(`  🏃 Requests/s: ${requestsPerSecond} req/s`);
  console.log(`  🏃 Concurrent: ${CONCURRENT_REQUESTS}`);
  console.log('');

  if (results.errors.length > 0) {
    console.log('⚠️  Errors:');
    const uniqueErrors = [...new Set(results.errors)];
    uniqueErrors.forEach((error) => {
      const count = results.errors.filter((e) => e === error).length;
      console.log(`  - ${error} (${count} times)`);
    });
  }

  console.log('');
  console.log('🎯 Performance Goals:');
  console.log(`  ${avgResponseTime <= 2000 ? '✓' : '✗'} Average < 2s (${avgResponseTime}ms)`);
  console.log(`  ${p95 <= 2500 ? '✓' : '✗'} P95 < 2.5s (${p95}ms)`);
  console.log(`  ${successRate >= 95 ? '✓' : '✗'} Success Rate > 95% (${successRate}%)`);
  console.log('');
}

// Run test
runPerformanceTest().catch((error) => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
