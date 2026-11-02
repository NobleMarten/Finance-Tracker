import { test } from '@playwright/test'
import { mockApi } from './fixtures'

const shot = (page, testInfo, name) =>
  page.screenshot({ path: `screenshots/${testInfo.project.name}/${name}.png`, fullPage: false })

const settle = (page) => page.waitForTimeout(900)

test('screens', async ({ page }, testInfo) => {
  const mobile = testInfo.project.name.startsWith('mobile')
  await mockApi(page)
  await page.goto('/')
  await page.getByText('Последние операции').first().waitFor()
  await settle(page)
  await shot(page, testInfo, '01-home')

  if (mobile) {
    await page.getByRole('tab', { name: /Неделя/ }).click()
    await page.getByRole('tab', { name: /Неделя/ }).click()
    await settle(page)
    await shot(page, testInfo, '02-home-week-open')
  }

  const go = async (label) => {
    if (mobile) await page.getByRole('navigation').getByRole('button', { name: label }).click()
    else await page.getByRole('navigation').getByRole('button', { name: label, exact: true }).click()
    await settle(page)
  }

  await go('История')
  await shot(page, testInfo, '03-history')
  await go('Статистика')
  await page.waitForTimeout(600)
  await shot(page, testInfo, '04-stats')
  await page.getByRole('button', { name: 'Показать: крупные траты' }).first().click()
  await settle(page)
  await shot(page, testInfo, '11-stats-drill')
  await page.keyboard.press('Escape')
  await settle(page)
  await go('Главная')

  await page.getByRole('button', { name: mobile ? 'Добавить расход' : 'Добавить' }).first().click()
  await settle(page)
  await shot(page, testInfo, '05-add')
  await page.keyboard.press('Escape')
  await settle(page)

  await page.getByRole('button', { name: /Кофе 09:12/ }).first().click()
  await settle(page)
  await shot(page, testInfo, '09-edit')
  await page.keyboard.press('Escape')
  await settle(page)

  await page.getByRole('button', { name: 'Профиль' }).first().click()
  await settle(page)
  await shot(page, testInfo, '06-profile')
  await page.getByRole('button', { name: 'API-токены' }).click()
  await page.waitForTimeout(1200)
  await shot(page, testInfo, '10-tokens')
})

test('auth', async ({ page }, testInfo) => {
  await mockApi(page, { signedIn: false })
  await page.goto('/login')
  await settle(page)
  await shot(page, testInfo, '07-login')
  await page.goto('/register')
  await settle(page)
  await shot(page, testInfo, '08-register')
})
