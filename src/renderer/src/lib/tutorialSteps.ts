/**
 * Get tutorial steps with i18n support
 * Steps are modular and can be easily added/removed/reordered
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getTutorialSteps = (t: (key: string) => string): any[] => [
  {
    id: 'welcome',
    title: t('tutorial.welcome.title'),
    text: t('tutorial.welcome.text'),
    buttons: [
      {
        text: t('tutorial.skip'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        action(this: any) {
          this.cancel();
        },
        classes: 'shepherd-button-secondary'
      },
      {
        text: t('tutorial.next'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        action(this: any) {
          this.next();
        }
      }
    ]
  },
  {
    id: 'brokers',
    attachTo: { element: '[data-tour="brokers-nav"]', on: 'right' },
    title: t('tutorial.brokers.title'),
    text: t('tutorial.brokers.text'),
    buttons: [
      {
        text: t('tutorial.back'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        action(this: any) {
          this.back();
        },
        classes: 'shepherd-button-secondary'
      },
      {
        text: t('tutorial.next'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        action(this: any) {
          this.next();
        }
      }
    ]
  },
  {
    id: 'sidebar',
    attachTo: { element: '[data-tour="sidebar"]', on: 'right' },
    title: t('tutorial.sidebar.title'),
    text: t('tutorial.sidebar.text'),
    buttons: [
      {
        text: t('tutorial.back'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        action(this: any) {
          this.back();
        },
        classes: 'shepherd-button-secondary'
      },
      {
        text: t('tutorial.next'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        action(this: any) {
          this.next();
        }
      }
    ]
  },
  {
    id: 'dashboard',
    attachTo: { element: '[data-tour="dashboard"]', on: 'bottom' },
    title: t('tutorial.dashboard.title'),
    text: t('tutorial.dashboard.text'),
    buttons: [
      {
        text: t('tutorial.back'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        action(this: any) {
          this.back();
        },
        classes: 'shepherd-button-secondary'
      },
      {
        text: t('tutorial.next'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        action(this: any) {
          this.next();
        }
      }
    ]
  },
  {
    id: 'complete',
    title: t('tutorial.complete.title'),
    text: t('tutorial.complete.text'),
    buttons: [
      {
        text: t('tutorial.finish'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        action(this: any) {
          this.complete();
        }
      }
    ]
  }
];
