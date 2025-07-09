import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCgK1TYh_V44yESkJYTeVXVslwiLXyZ5sU",
  authDomain: "outreachpro-4246c.firebaseapp.com",
  projectId: "outreachpro-4246c",
  storageBucket: "outreachpro-4246c.firebasestorage.app",
  messagingSenderId: "913126480565",
  appId: "1:913126480565:web:5aa0b78f9d47e40600fcfc",
  measurementId: "G-MGFF5PXFG8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider };
