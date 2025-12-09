import { device, element, by, expect as detoxExpect } from 'detox';

describe('Voice Logging Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
    // Login first
    await element(by.id('email-input')).typeText('user@example.com');
    await element(by.id('password-input')).typeText('ValidPassword123');
    await element(by.id('login-submit')).tap();
    await detoxExpect(element(by.id('home-screen'))).toBeVisible();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should display voice logging button on home screen', async () => {
    await detoxExpect(element(by.id('voice-log-button'))).toBeVisible();
  });

  it('should open voice recording modal when button is tapped', async () => {
    await element(by.id('voice-log-button')).tap();
    await detoxExpect(element(by.id('voice-recording-modal'))).toBeVisible();
  });

  it('should start recording when record button is tapped', async () => {
    await element(by.id('record-button')).tap();
    await detoxExpect(element(by.id('recording-indicator'))).toBeVisible();
  });

  it('should stop recording when stop button is tapped', async () => {
    await element(by.id('stop-button')).tap();
    await detoxExpect(element(by.id('recording-indicator'))).not.toBeVisible();
  });

  it('should display parsed workout data', async () => {
    await detoxExpect(element(by.id('exercise-name'))).toBeVisible();
    await detoxExpect(element(by.id('weight-value'))).toBeVisible();
    await detoxExpect(element(by.id('reps-value'))).toBeVisible();
  });

  it('should allow editing parsed data', async () => {
    await element(by.id('exercise-name')).multiTap(2);
    await element(by.id('exercise-name')).clearText();
    await element(by.id('exercise-name')).typeText('Squat');
    await detoxExpect(element(by.text('Squat'))).toBeVisible();
  });

  it('should save workout when confirm button is tapped', async () => {
    await element(by.id('confirm-button')).tap();
    await detoxExpect(element(by.id('success-message'))).toBeVisible();
  });

  it('should show confirmation message with exercise details', async () => {
    await detoxExpect(element(by.text(/Logged.*Squat/))).toBeVisible();
  });

  it('should close modal after saving', async () => {
    await detoxExpect(element(by.id('voice-recording-modal'))).not.toBeVisible();
  });

  it('should add workout to history', async () => {
    await element(by.id('history-tab')).tap();
    await detoxExpect(element(by.text('Squat'))).toBeVisible();
  });

  it('should handle voice parsing errors gracefully', async () => {
    await element(by.id('voice-log-button')).tap();
    // Simulate unclear audio
    await element(by.id('record-button')).tap();
    await device.shake();
    await element(by.id('stop-button')).tap();
    await detoxExpect(element(by.text(/unclear|try again/))).toBeVisible();
  });
});

