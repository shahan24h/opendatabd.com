/**
 * Vercel Web Analytics initialization
 * This script injects Vercel Analytics tracking into the page
 */

(function() {
  // Initialize Vercel Analytics
  window.va = window.va || function () { 
    (window.vaq = window.vaq || []).push(arguments); 
  };

  // Load the analytics script
  var script = document.createElement('script');
  script.defer = true;
  script.src = '/_vercel/insights/script.js';
  
  // Append to document head
  var firstScript = document.getElementsByTagName('script')[0];
  firstScript.parentNode.insertBefore(script, firstScript);
})();
