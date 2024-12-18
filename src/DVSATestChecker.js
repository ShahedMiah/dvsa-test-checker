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

  async searchForTests(licenseNumber, certificateNumber) {
    try {
      console.log('Navigating to DVSA login page...');
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
      await this.randomDelay();

      // Wait for and fill in the license number field
      console.log('Looking for driving licence input...');
      await this.page.waitForSelector('#drivinglicence');
      await this.page.type('#drivinglicence', licenseNumber, { delay: 100 });
      await this.randomDelay();

      // Wait for and fill in the reference number field
      console.log('Looking for reference number input...');
      await this.page.waitForSelector('#ref-number');
      await this.page.type('#ref-number', certificateNumber, { delay: 100 });
      await this.randomDelay();

      // Click the submit button
      console.log('Looking for submit button...');
      await this.page.click('button[type="submit"]');
      await this.page.waitForNavigation({ waitUntil: 'networkidle0' });

      // Check for error messages
      const errorMessage = await this.page.$eval('.error-message', 
        el => el.textContent.trim()
      ).catch(() => null);

      if (errorMessage) {
        throw new Error(errorMessage);
      }

      // Extract available test dates and times
      console.log('Looking for available test slots...');
      const availableTests = await this.page.evaluate(() => {
        const slots = document.querySelectorAll('.SlotPicker-slot');
        return Array.from(slots).map(slot => ({
          date: slot.querySelector('.SlotPicker-day')?.textContent.trim(),
          time: slot.querySelector('.SlotPicker-time')?.textContent.trim(),
          location: document.querySelector('.test-centre-name')?.textContent.trim() || 'Unknown Location'
        }));
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