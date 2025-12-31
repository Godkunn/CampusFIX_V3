// Firebase Messaging.
/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAvuzXSVqpc46AJ4INvw95-77iBOIDYMxw",
  authDomain: "campusfix-v3.firebaseapp.com",
  projectId: "campusfix-v3",
  storageBucket: "campusfix-v3.firebasestorage.app",
  messagingSenderId: "261097504544",
  appId: "1:261097504544:web:da94edde376f9fbd2a6145",
  measurementId: "G-NKHX33QDWW"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png' // Ensure you have an icon in public folder
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});