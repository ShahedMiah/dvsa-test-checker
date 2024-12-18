const puppeteer = require('puppeteer');

class DVSATestChecker {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseUrl = 'https://driverpracticaltest.dvsa.gov.uk/login';
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: false, // Changed to false so we can see what's happening and handle CAPTCHA
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--window-size=1920,1080',
      ],
      defaultViewport: {
        width: 1920,
        height: 1080
      }
    });
    this.page = await this.browser.newPage();
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await this.page.setDefaultNavigationTimeout(60000); // Increased timeout for manual CAPTCHA
  }

  async searchForTests(licenseNumber, secondNumber, location, isTheoryNumber = true) {
    try {
      console.log('Navigating to DVSA login page...');
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
      await this.randomDelay();

      // Fill in the login form
      console.log('Entering driving licence number...');
      await this.page.waitForSelector('#driving-licence-number');
      await this.page.type('#driving-licence-number', licenseNumber, { delay: 100 });
      await this.randomDelay();

      if (isTheoryNumber) {
        console.log('Entering theory test pass number...');
        await this.page.waitForSelector('#theory-test-pass-number');
        await this.page.type('#theory-test-pass-number', secondNumber, { delay: 100 });
      } else {
        console.log('Entering test reference number...');
        await this.page.waitForSelector('#application-reference-number');
        await this.page.type('#application-reference-number', secondNumber, { delay: 100 });
      }
      await this.randomDelay();

      // Submit the form
      console.log('Submitting form...');
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle0' }),
        this.page.click('input[type="submit"]')
      ]);

      // Wait for manual CAPTCHA completion if needed
      console.log('Waiting for potential CAPTCHA and navigation...');
      await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 });

      // Look for the change test centre button
      console.log('Looking for change test centre button...');
      await this.page.waitForSelector('a[href*="change-test-centre"], button:contains("Change test centre")');
      await this.page.click('a[href*="change-test-centre"], button:contains("Change test centre")');
      await this.randomDelay();

      // Enter location in search
      console.log('Searching for test centres near:', location);
      await this.page.waitForSelector('input[type="text"][name*="searchQuery"]');
      await this.page.type('input[type="text"][name*="searchQuery"]', location, { delay: 100 });
      await this.page.keyboard.press('Enter');
      await this.randomDelay();

      // Keep clicking 'Show more' until no more results or max attempts reached
      console.log('Loading all test centres...');
      let showMoreVisible = true;
      let attempts = 0;
      const maxAttempts = 10;

      while (showMoreVisible && attempts < maxAttempts) {
        try {
          await this.page.waitForSelector('button:contains("Show more")', { timeout: 5000 });
          await this.page.click('button:contains("Show more")');
          await this.randomDelay();
          attempts++;
        } catch (e) {
          showMoreVisible = false;
        }
      }

      // Extract available test dates and times for all centres
      console.log('Extracting available test slots...');
      const availableTests = await this.page.evaluate(() => {
        const centres = document.querySelectorAll('.test-centre-results-item');
        return Array.from(centres).map(centre => {
          const name = centre.querySelector('.test-centre-name')?.textContent.trim();
          const address = centre.querySelector('.test-centre-address')?.textContent.trim();
          const availability = centre.querySelector('.test-centre-availability')?.textContent.trim();
          
          return {
            name,
            address,
            availability,
            hasTests: !centre.textContent.includes('No tests available')
          };
        });
      });

      return availableTests;

    } catch (error) {
      console.error('Error during test search:', error);
      throw error;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async randomDelay() {
    const delay = Math.floor(Math.random() * (2000 - 500 + 1) + 500);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

module.exports = { DVSATestChecker };