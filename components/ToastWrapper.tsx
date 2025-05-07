'use client';

import React, { useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ToastWrapper = () => {
  useEffect(() => {
    toast.dismiss();
    
    const unsubscribe = toast.onChange(() => {
    });
    
    return () => {
      unsubscribe();
      toast.dismiss();
    };
  }, []);

  return (
    <ToastContainer
      position="top-right"
      autoClose={3000}
      hideProgressBar
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="light"
    />
  );
};

export default ToastWrapper;