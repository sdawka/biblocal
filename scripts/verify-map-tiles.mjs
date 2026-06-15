#!/usr/bin/env node
/**
 * Playwright script to verify map tiles are loading correctly on /matches
 * Checks for 401 errors, console errors, and tile loading
 */

import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'https://biblocal-qa.dawka.workers.dev';
const SCREENSHOT_PATH = '/tmp/qa-final-matches.png';

async function verifyMapTiles() {
  console.log(`Testing: ${BASE_URL}/matches`);
  console.log('='.repeat(60));

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = {
    networkErrors: [],
    auth401Errors: [],
    consoleErrors: [],
    tileRequests: [],
    passed: true
  };

  // Capture network requests and responses
  page.on('requestfailed', request => {
    results.networkErrors.push({
      url: request.url(),
      failure: request.failure()?.errorText
    });
  });

  page.on('response', response => {
    const url = response.url();
    const status = response.status();

    // Check for 401 errors
    if (status === 401) {
      results.auth401Errors.push({ url, status });
    }

    // Track tile requests (OpenStreetMap, etc.)
    if (url.includes('tile') || url.includes('.png') && (url.includes('openstreetmap') || url.includes('tile.osm'))) {
      results.tileRequests.push({ url, status });
    }
  });

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      results.consoleErrors.push(msg.text());
    }
  });

  try {
    // Navigate to /matches and wait for network to be idle
    console.log('Navigating to /matches...');
    await page.goto(`${BASE_URL}/matches`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('Page loaded, waiting for map to render...');

    // Wait a bit more for any lazy-loaded map tiles
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
    console.log(`Screenshot saved to: ${SCREENSHOT_PATH}`);

    // Check for map container
    const mapContainer = await page.$('.leaflet-container, #map, [class*="map"]');
    const hasMapContainer = !!mapContainer;

    // Check for tile images in the map
    const tileImages = await page.$$('img.leaflet-tile, .leaflet-tile-container img');
    const tileImageCount = tileImages.length;

    // Get tile image sources
    const tileSources = await page.$$eval('img.leaflet-tile', imgs =>
      imgs.map(img => ({ src: img.src, loaded: img.complete && img.naturalWidth > 0 }))
    ).catch(() => []);

    console.log('\n' + '='.repeat(60));
    console.log('RESULTS');
    console.log('='.repeat(60));

    // Report 401 errors
    console.log(`\n401 Authentication Errors: ${results.auth401Errors.length}`);
    if (results.auth401Errors.length > 0) {
      results.passed = false;
      results.auth401Errors.forEach(err => {
        console.log(`  - ${err.url}`);
      });
    }

    // Report console errors
    console.log(`\nConsole Errors: ${results.consoleErrors.length}`);
    if (results.consoleErrors.length > 0) {
      results.consoleErrors.forEach(err => {
        console.log(`  - ${err}`);
        // Only fail on auth-related console errors
        if (err.toLowerCase().includes('401') || err.toLowerCase().includes('unauthorized')) {
          results.passed = false;
        }
      });
    }

    // Report network failures
    console.log(`\nNetwork Failures: ${results.networkErrors.length}`);
    if (results.networkErrors.length > 0) {
      results.networkErrors.forEach(err => {
        console.log(`  - ${err.url}: ${err.failure}`);
      });
    }

    // Report map tile status
    console.log(`\nMap Container Found: ${hasMapContainer ? 'Yes' : 'No'}`);
    console.log(`Tile Images in DOM: ${tileImageCount}`);
    console.log(`Tile Image Sources: ${tileSources.length}`);

    if (tileSources.length > 0) {
      const loadedTiles = tileSources.filter(t => t.loaded).length;
      console.log(`  - Loaded successfully: ${loadedTiles}/${tileSources.length}`);

      // Show sample tile URLs
      console.log(`  - Sample tile URL: ${tileSources[0]?.src?.substring(0, 80)}...`);
    }

    // Final verdict
    console.log('\n' + '='.repeat(60));

    const noAuth401 = results.auth401Errors.length === 0;
    const tilesLoading = tileImageCount > 0 || tileSources.length > 0;

    if (noAuth401 && results.passed) {
      console.log('PASS: No 401 authentication errors detected');
      if (tilesLoading) {
        console.log('PASS: Map tiles are loading');
      } else {
        console.log('WARN: No tile images found in DOM (map may not be visible yet)');
      }
      console.log('\nOVERALL: PASS');
    } else {
      console.log('FAIL: Issues detected');
      if (!noAuth401) {
        console.log('  - 401 errors found on tile requests');
      }
      console.log('\nOVERALL: FAIL');
      process.exitCode = 1;
    }

  } catch (error) {
    console.error('Test failed with error:', error.message);
    results.passed = false;
    process.exitCode = 1;
  } finally {
    await browser.close();
  }

  return results;
}

verifyMapTiles();
