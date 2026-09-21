import { Injectable, inject } from '@angular/core';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, signInWithPopup, signOut } from 'firebase/auth';
import { WEB_ENV } from '@agendarhorario/web-data-access';

@Injectable({ providedIn: 'root' })
export class FirebaseClientService {
  private readonly env = inject(WEB_ENV);
  private app: FirebaseApp | null = null;

  get enabled(): boolean {
    return Boolean(this.env.firebase?.apiKey && this.env.firebase.authDomain);
  }

  async signInWithGoogle(): Promise<string> {
    const auth = this.auth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const credential = await signInWithPopup(auth, provider);
    const idToken = await credential.user.getIdToken();
    await signOut(auth);
    return idToken;
  }

  private auth() {
    const cfg = this.env.firebase;
    if (!cfg?.apiKey || !cfg.authDomain || !cfg.projectId) {
      throw new Error('Login com Google não está configurado');
    }
    if (!this.app) {
      this.app = getApps().length
        ? getApp()
        : initializeApp({
            apiKey: cfg.apiKey,
            authDomain: cfg.authDomain,
            projectId: cfg.projectId,
          });
    }
    return getAuth(this.app);
  }
}
