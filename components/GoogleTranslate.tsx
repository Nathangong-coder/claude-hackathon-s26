"use client";

import { useEffect } from "react";
import Script from "next/script";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate: {
        TranslateElement: new (
          options: object,
          elementId: string
        ) => void;
      };
    };
  }
}

export function GoogleTranslate() {
  useEffect(() => {
    window.googleTranslateElementInit = () => {
      if (!window.google?.translate?.TranslateElement) return;
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: "es,zh-CN,zh-TW,ko,vi,tl,ar,fr,pt,ru,ja,hi,fa,ur",
          layout: 0,
          autoDisplay: false,
        },
        "google_translate_element"
      );
    };
  }, []);

  return (
    <>
      <Script
        src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="lazyOnload"
      />
      <div
        className="fixed right-3 top-3 z-50 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-md"
        id="google_translate_element"
      />
    </>
  );
}
