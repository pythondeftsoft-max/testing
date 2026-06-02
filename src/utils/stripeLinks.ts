import { toast } from "sonner";

/**
 * Utility to safely open Stripe Connect links with fallbacks for iframe restrictions
 */
export const openStripeLink = (url: string, options: {
  buttonText?: string;
  onCopyFallback?: () => void;
} = {}) => {
  const { buttonText = "Stripe dashboard", onCopyFallback } = options;
  
  // Detect if we're in an iframe/embedded context
  const inIframe = window !== window.parent;
  
  try {
    // Force external opening with security flags
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    
    // Check if popup was blocked
    if (!opened || opened.closed || typeof opened.closed === 'undefined') {
      throw new Error('Popup blocked');
    }
    
    // Show success message, especially helpful in iframe contexts
    if (inIframe) {
      toast.success(`Opening ${buttonText} in new tab`, {
        description: "If nothing opened, try the Copy Link option below"
      });
    }
    
  } catch (error) {
    console.warn('Failed to open Stripe link:', error);
    
    // Show iframe-specific messaging
    if (inIframe) {
      toast.error("Can't open Stripe in preview mode", {
        description: "Stripe blocks embedded access. Use Copy Link to open manually.",
        duration: 5000
      });
    } else {
      toast.error("Popup blocked", {
        description: "Please allow popups or use Copy Link option",
        duration: 5000
      });
    }
    
    // Trigger copy fallback if provided
    onCopyFallback?.();
  }
};

/**
 * Copy a link to clipboard with user feedback
 */
export const copyStripeLink = async (url: string, buttonText: string = "Stripe link") => {
  try {
    await navigator.clipboard.writeText(url);
    toast.success(`${buttonText} copied to clipboard`, {
      description: "Paste it in a new browser tab to access Stripe"
    });
  } catch (error) {
    console.warn('Failed to copy link:', error);
    
    // Fallback: show the URL in a prompt
    const userCopied = prompt(
      `Copy this Stripe link and paste it in a new tab:\n\n${url}`
    );
    
    if (userCopied !== null) {
      toast.success("Link shown for manual copying");
    }
  }
};

/**
 * Check if we're in an embedded/iframe context
 */
export const isEmbeddedContext = () => {
  return window !== window.parent;
};