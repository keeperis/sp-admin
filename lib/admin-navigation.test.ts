import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import { adminNavItems, adminSections, isAdminNavActive } from './admin-navigation';

test('home and sidebar share every real section, with a separate home entry', () => {
  assert.deepEqual(adminNavItems.slice(1), adminSections);
  assert.equal(adminNavItems[0].href, '/admin');
  assert.equal(adminNavItems[0].label, 'Pagrindinis');
  assert.equal(
    adminSections.some((section) => section.href === '/admin'),
    false,
  );
});

test('all eleven existing sections are retained and overview has its own route', () => {
  assert.deepEqual(adminSections.map((section) => section.href).sort(), [
    '/admin/bookings',
    '/admin/content',
    '/admin/corporate',
    '/admin/legal',
    '/admin/meta',
    '/admin/notifications',
    '/admin/overview',
    '/admin/recurring',
    '/admin/reminders',
    '/admin/tickets',
    '/admin/workshops',
  ]);
  assert.equal(
    adminSections.find((section) => section.label === 'Apžvalga')?.href,
    '/admin/overview',
  );
});

test('navigation destinations exist and labels are unique', () => {
  assert.equal(new Set(adminNavItems.map((section) => section.label)).size, adminNavItems.length);
  assert.equal(new Set(adminNavItems.map((section) => section.href)).size, adminNavItems.length);
  for (const section of adminSections) {
    assert.ok(section.description.trim());
    assert.ok(section.icon);
    assert.ok(existsSync(`app${section.href}/page.tsx`), section.href);
  }
});

test('home is active only at root; sections match only exact path segments', () => {
  assert.equal(isAdminNavActive('/admin', '/admin'), true);
  assert.equal(isAdminNavActive('/admin/overview', '/admin'), false);
  assert.equal(isAdminNavActive('/admin/overview', '/admin/overview'), true);
  assert.equal(isAdminNavActive('/admin/recurring/groups', '/admin/recurring'), true);
  assert.equal(isAdminNavActive('/admin/recurring-other', '/admin/recurring'), false);
});
