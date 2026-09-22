import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, type CanActivateFn, type Route } from '@angular/router';
import { appRoutes } from './app.routes';

const loaders = (routes: Route[]): Array<() => Promise<unknown>> => {
  const found: Array<() => Promise<unknown>> = [];
  for (const route of routes) {
    if (route.loadComponent) {
      const load = route.loadComponent;
      found.push(() => Promise.resolve(load()));
    }
    if (route.children) found.push(...loaders(route.children));
  }
  return found;
};

describe('appRoutes', () => {
  it('loads every lazy page', async () => {
    for (const load of loaders(appRoutes)) {
      await expect(load()).resolves.toEqual(expect.any(Function));
    }
  });

  it('rewrites legacy /admin urls to /dashboard', () => {
    const admin = appRoutes.find((route) => route.path === 'admin');
    TestBed.configureTestingModule({ providers: [provideRouter(appRoutes)] });
    const tree = TestBed.runInInjectionContext(() =>
      (admin?.canActivate?.[0] as CanActivateFn)(
        {} as never,
        { url: '/admin/servicos?tab=1' } as never,
      ),
    );
    expect(TestBed.inject(Router).serializeUrl(tree as never)).toBe('/dashboard/servicos?tab=1');
  });

  it('declares the public and authenticated entry points', () => {
    expect(appRoutes.map((route) => route.path)).toEqual(
      expect.arrayContaining(['login', 'dashboard', 'p/:slug', 'a/:token', '**']),
    );
  });
});
