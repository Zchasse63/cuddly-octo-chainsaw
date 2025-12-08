import { device, element, by, expect as detoxExpect } from 'detox';

describe('Authentication Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  afterAll(async () => {
    await device.sendUserInteraction({ type: 'shake' });
  });

  it('should display login screen on app start', async () => {
    await detoxExpect(element(by.id('login-screen'))).toBeVisible();
  });

  it('should navigate to signup when signup button is tapped', async () => {
    await element(by.id('signup-button')).multiTap();
    await detoxExpect(element(by.id('signup-screen'))).toBeVisible();
  });

  it('should validate email format', async () => {
    await element(by.id('signup-button')).tap();
    await element(by.id('email-input')).typeText('invalid-email');
    await element(by.id('signup-submit')).tap();
    await detoxExpect(element(by.text('Invalid email format'))).toBeVisible();
  });

  it('should validate password requirements', async () => {
    await element(by.id('email-input')).clearText();
    await element(by.id('email-input')).typeText('user@example.com');
    await element(by.id('password-input')).typeText('short');
    await element(by.id('signup-submit')).tap();
    await detoxExpect(element(by.text('Password must be at least 8 characters'))).toBeVisible();
  });

  it('should successfully sign up with valid credentials', async () => {
    await element(by.id('email-input')).clearText();
    await element(by.id('email-input')).typeText('newuser@example.com');
    await element(by.id('password-input')).clearText();
    await element(by.id('password-input')).typeText('ValidPassword123');
    await element(by.id('name-input')).typeText('John Doe');
    await element(by.id('signup-submit')).tap();
    await detoxExpect(element(by.id('onboarding-screen'))).toBeVisible();
  });

  it('should navigate to login from signup', async () => {
    await element(by.id('login-link')).tap();
    await detoxExpect(element(by.id('login-screen'))).toBeVisible();
  });

  it('should handle login with valid credentials', async () => {
    await element(by.id('email-input')).typeText('user@example.com');
    await element(by.id('password-input')).typeText('ValidPassword123');
    await element(by.id('login-submit')).tap();
    await detoxExpect(element(by.id('home-screen'))).toBeVisible();
  });

  it('should show error on invalid login', async () => {
    await element(by.id('email-input')).typeText('user@example.com');
    await element(by.id('password-input')).typeText('WrongPassword');
    await element(by.id('login-submit')).tap();
    await detoxExpect(element(by.text('Invalid credentials'))).toBeVisible();
  });

  it('should handle logout', async () => {
    await element(by.id('profile-tab')).tap();
    await element(by.id('logout-button')).tap();
    await detoxExpect(element(by.id('login-screen'))).toBeVisible();
  });
});

