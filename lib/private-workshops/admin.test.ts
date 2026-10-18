import assert from 'node:assert/strict';
import test from 'node:test';
import { validateConfig } from './admin';
import type { PrivateWorkshopConfig } from './types';

const config: PrivateWorkshopConfig = {
  version: 1,
  settings: {
    enabled: true,
    titleLt: 'Privatūs keramikos užsiėmimai',
    titleEn: '',
    descriptionLt: 'Užsiėmimo aprašymas',
    descriptionEn: '',
    placeName: 'Studija',
    coverImageUrl: '',
    cancellationTermsLt: '',
    cancellationTermsEn: '',
    reschedulingTermsLt: '',
    reschedulingTermsEn: '',
    memoLt: '',
    memoEn: '',
    holdHours: 48,
    startStepMin: 30,
    bufferMin: 60,
    wholeWindow: false,
    addonsDueNow: false,
  },
  types: [],
  addons: [],
  windows: [],
};

test('private registration can use shared site terms without separate legal text', () => {
  assert.equal(validateConfig(config), null);
});

test('shared terms do not remove the required workshop information', () => {
  for (const field of ['titleLt', 'descriptionLt', 'placeName'] as const) {
    assert.notEqual(
      validateConfig({ ...config, settings: { ...config.settings, [field]: '' } }),
      null,
      field,
    );
  }
});
