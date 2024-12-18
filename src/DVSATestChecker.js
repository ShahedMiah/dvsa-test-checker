const puppeteer = require('puppeteer');

class DVSATestChecker {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseUrl = 'https://driverpracticaltest.dvsa.gov.uk/login';
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: 'new',
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
    await this.page.setDefaultNavigationTimeout(30000);
  }

  async searchForTests(licenseNumber, secondNumber, isTheoryNumber = true) {
    try {
      console.log('Navigating to DVSA login page...');
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
      await this.randomDelay();

      // Wait for and fill in the license number field
      console.log('Entering driving licence number...');
      await this.page.waitForSelector('#driving-licence-number');
      await this.page.type('#driving-licence-number', licenseNumber, { delay: 100 });
      await this.randomDelay();

      if (isTheoryNumber) {
        // Using Theory Test Pass Number
        console.log('Entering theory test pass number...');
        await this.page.waitForSelector('#theory-test-pass-number');
        await this.page.type('#theory-test-pass-number', secondNumber, { delay: 100 });
      } else {
        // Using Test Reference Number
        console.log('Entering test reference number...');
        await this.page.waitForSelector('#application-reference-number');
        await this.page.type('#application-reference-number', secondNumber, { delay: 100 });
      }
      await this.randomDelay();

      // Click the submit button
      console.log('Submitting form...');
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle0' }),
        this.page.click('input[type="submit"]')
      ]);

      // Check for various error message selectors that might be present
      const possibleErrorSelectors = ['.error-message', '.error-summary', '.alert-message'];
      for (const selector of possibleErrorSelectors) {
        const errorElement = await this.page.$(selector);
        if (errorElement) {
          const errorMessage = await this.page.evaluate(el => el.textContent.trim(), errorElement);
          if (errorMessage) {
            throw new Error(errorMessage);
          }
        }
      }

      // Extract available test dates and times
      console.log('Looking for available test slots...');
      const availableTests = await this.page.evaluate(() => {
        // Add multiple possible selectors for test slots
        const slotSelectors = ['.SlotPicker-slot', '.slot-list-item', '.test-slot'];
        let slots = [];
        
        for (const selector of slotSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            slots = Array.from(elements);
            break;
          }
        }

        return slots.map(slot => {
          // Try multiple possible selectors for date/time/location
          const getContent = (selectors) => {
            for (const selector of selectors) {
              const element = slot.querySelector(selector);
              if (element) {
                return element.textContent.trim();
              }
            }
            return null;
          };

          return {
            date: getContent(['.SlotPicker-day', '.date', '.test-date']) || 'Date not found',
            time: getContent(['.SlotPicker-time', '.time', '.test-time']) || 'Time not found',
            location: getContent(['.test-centre-name', '.location', '.test-center']) || 'Location not found'
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