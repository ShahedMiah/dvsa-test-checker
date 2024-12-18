const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');

puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

class DVSATestChecker {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseUrl = 'https://driverpracticaltest.dvsa.gov.uk/login';
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--disable-blink-features=AutomationControlled',
        '--start-maximized',
        `--window-size=1920,1080`,
      ],
      defaultViewport: null,
      ignoreHTTPSErrors: true
    });

    this.page = await this.browser.newPage();

    // Set more realistic browser environment
    await this.page.evaluateOnNewDocument(() => {
      // Override the webdriver check
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      
      // Override chrome automation
      window.chrome = {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {}
      };
      
      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
    });

    // Set a more realistic user agent
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Add additional headers to seem more real
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    });

    await this.page.setDefaultNavigationTimeout(60000);
  }

  async searchForTests(licenseNumber, secondNumber, location, isTheoryNumber = true) {
    try {
      console.log('Navigating to DVSA login page...');
      await this.page.goto(this.baseUrl, { 
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      await this.randomDelay();

      // Add random mouse movements
      await this.simulateHumanBehavior();

      console.log('Entering driving licence number...');
      await this.typeHumanLike('#driving-licence-number', licenseNumber);
      await this.randomDelay();

      if (isTheoryNumber) {
        console.log('Entering theory test pass number...');
        await this.typeHumanLike('#theory-test-pass-number', secondNumber);
      } else {
        console.log('Entering test reference number...');
        await this.typeHumanLike('#application-reference-number', secondNumber);
      }
      await this.randomDelay();

      console.log('Submitting form...');
      await this.clickHumanLike('input[type="submit"]');

      // Wait for navigation and potential CAPTCHA
      console.log('Waiting for navigation and potential CAPTCHA...');
      await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 });

      // Check for access denied
      const accessDenied = await this.page.evaluate(() => {
        return document.body.textContent.includes('Access Denied') || 
               document.body.textContent.includes('Error 15');
      });

      if (accessDenied) {
        throw new Error('Access denied by DVSA security. Please try again later.');
      }

      // Look for and click change test centre
      console.log('Looking for change test centre option...');
      await this.page.waitForSelector('a[href*="change-test-centre"], button:contains("Change test centre")');
      await this.clickHumanLike('a[href*="change-test-centre"], button:contains("Change test centre")');
      await this.randomDelay();

      // Enter location
      console.log('Searching for test centres near:', location);
      await this.typeHumanLike('input[type="text"][name*="searchQuery"]', location);
      await this.page.keyboard.press('Enter');
      await this.randomDelay();

      // Extract available test dates and times
      console.log('Extracting test centre information...');
      const centres = await this.page.evaluate(() => {
        const items = document.querySelectorAll('.test-centre-results-item');
        return Array.from(items).map(item => ({
          name: item.querySelector('.test-centre-name')?.textContent.trim(),
          address: item.querySelector('.test-centre-address')?.textContent.trim(),
          availability: item.querySelector('.test-centre-availability')?.textContent.trim(),
          hasTests: !item.textContent.includes('No tests available')
        }));
      });

      return centres;

    } catch (error) {
      console.error('Error during test search:', error);
      throw error;
    }
  }

  async simulateHumanBehavior() {
    // Random mouse movements
    for (let i = 0; i < 5; i++) {
      const x = Math.floor(Math.random() * 800);
      const y = Math.floor(Math.random() * 600);
      await this.page.mouse.move(x, y);
      await this.randomDelay(100, 500);
    }
  }

  async typeHumanLike(selector, text) {
    await this.page.waitForSelector(selector);
    await this.page.focus(selector);
    
    for (let i = 0; i < text.length; i++) {
      await this.page.keyboard.type(text[i]);
      await this.randomDelay(50, 150);
    }
  }

  async clickHumanLike(selector) {
    await this.page.waitForSelector(selector);
    const element = await this.page.$(selector);
    
    // Get element position
    const box = await element.boundingBox();
    
    // Move mouse to element with some randomness
    await this.page.mouse.move(
      box.x + box.width * Math.random(),
      box.y + box.height * Math.random()
    );
    
    await this.randomDelay(100, 300);
    await this.page.mouse.click(box.x + box.width/2, box.y + box.height/2);
  }

  async randomDelay(min = 500, max = 2000) {
    const delay = Math.floor(Math.random() * (max - min + 1) + min);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

module.exports = { DVSATestChecker };