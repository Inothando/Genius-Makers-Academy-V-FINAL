import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, Mail, ArrowRight, Loader2, CheckCircle2, Quote, LogIn } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import { Navbar } from '../components/Navbar';

export function SignInPage() {
  const navigate = useNavigate();
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phone Auth State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [timer, setTimer] = useState(0);
  const otpInputs = useRef<(HTMLInputElement | null)[]>([]);

  // Email Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const setupRecaptcha = () => {
    if ((window as any).recaptchaVerifier) return;
    (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {
        console.log('Recaptcha resolved');
      }
    });
  };

  const handleSendOTP = async () => {
    if (phoneNumber.length !== 9) {
      setError('Please enter a valid 9-digit phone number');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setupRecaptcha();
      const formattedPhone = `+27${phoneNumber}`;
      const verifier = (window as any).recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      setConfirmationResult(result);
      setVerificationId(result.verificationId);
      setTimer(60);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to send OTP');
      if (err.code === 'auth/invalid-phone-number') {
        setError('Invalid phone number format.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const code = otp.join('');
    if (code.length !== 6) return;
    
    setLoading(true);
    setError(null);
    try {
      if (confirmationResult) {
        await confirmationResult.confirm(code);
        navigate('/profile');
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-verification-code') {
        setError('Invalid OTP code. Please check and try again.');
      } else {
        setError('Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isRegistering) {
        if (!fullName.trim()) {
          setError('Please enter your full name');
          setLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
          displayName: fullName
        });
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const BOOTSTRAP_ADMIN_EMAILS = ['techinfinite.banking@gmail.com', 'contact@salainnovationlabs.com'];
        if (user.email && BOOTSTRAP_ADMIN_EMAILS.includes(user.email)) {
          navigate('/admin');
          return;
        }
      }
      navigate('/profile');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Try signing in instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password. Please check your details and try again.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError(err.message || 'An error occurred during authentication.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const BOOTSTRAP_ADMIN_EMAILS = ['techinfinite.banking@gmail.com', 'contact@salainnovationlabs.com'];
      if (user.email && BOOTSTRAP_ADMIN_EMAILS.includes(user.email)) {
        navigate('/admin');
      } else {
        navigate('/profile');
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') {
        setError('Google authentication failed. Please try again.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed before completion.');
      } else {
        setError(err.message || 'Google sign-in failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-lux-bg flex flex-col font-sans">
      <Navbar />
      
      <div className="flex-1 flex flex-col lg:flex-row mt-20">
        {/* Left Panel */}
        <div className="hidden lg:flex w-1/2 bg-lux-green-950 text-lux-bg text-lux-surface p-24 flex-col justify-between relative overflow-hidden">
           <div className="absolute inset-0 hidden opacity-[0.03] mix-blend-multiply"></div>
           <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-lux-green-500/10 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
           
           <div className="relative z-10">
             <div className="flex items-center gap-3 text-lux-surface mb-24">
                <div className="w-12 h-12 bg-lux-surface/10 border border-lux-border rounded-xl backdrop-blur-md flex items-center justify-center font-serif text-2xl font-medium text-lux-green-500">G</div>
                <span className="text-xl font-medium tracking-tight font-serif">Genius Makers Academy</span>
             </div>

             <div className="max-w-lg">
               <Quote className="text-lux-green-500/30 mb-8" size={48} fill="currentColor" />
               <h2 className="text-4xl lg:text-5xl font-serif text-lux-text mb-10 leading-[1.2] italic font-light">
                 "Engineered by top scholars for South African learners. Excellence is no longer a privilege—it's accessible."
               </h2>
               <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-full border border-lux-border bg-lux-bg overflow-hidden flex items-center justify-center">
                    <span className="font-serif text-xl text-lux-green-500 italic">SA</span>
                  </div>
                  <div>
                    <p className="text-lux-text font-medium tracking-wide">National Archive Platform</p>
                    <p className="text-lux-text text-xs uppercase tracking-widest mt-1">
                      South African Syllabus Standards
                    </p>
                  </div>
               </div>
             </div>
           </div>

           <div className="grid grid-cols-3 gap-8 relative z-10 border-t border-lux-border pt-12">
              <div>
                <p className="text-4xl font-serif text-lux-green-500 mb-2">3.5k<span className="text-lux-green-500/80 text-2xl">+</span></p>
                <p className="text-lux-text text-[9px] font-bold uppercase tracking-widest">Archived Papers</p>
              </div>
              <div>
                <p className="text-4xl font-serif text-lux-green-500 mb-2">10k<span className="text-lux-green-500/80 text-2xl">+</span></p>
                <p className="text-lux-text text-[9px] font-bold uppercase tracking-widest">Active Learners</p>
              </div>
              <div>
                <p className="text-4xl font-serif text-lux-green-500 mb-2">CAPS</p>
                <p className="text-lux-text text-[9px] font-bold uppercase tracking-widest">Standard Alignment</p>
              </div>
           </div>
        </div>

        {/* Right Panel: Form */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-lux-bg relative">
          <div className="w-full max-w-[440px] relative z-10">
             <div className="mb-12 text-center lg:text-left">
               <div className="inline-flex items-center gap-2 mb-4">
                 <span className="w-6 h-[1px] bg-lux-green-500"></span>
                 <span className="text-[9px] font-bold uppercase tracking-widest text-lux-green-500">Secure Entry</span>
               </div>
               <h1 className="text-4xl font-serif text-lux-text mb-4 tracking-tight">Access The Archive</h1>
               <p className="text-lux-text font-light tracking-wide text-sm">Join using your South African mobile number. Free forever.</p>
             </div>

             {error && (
               <div className="mb-8 p-4 bg-red-50/50 border border-red-200/50 rounded-2xl sm:rounded-3xl flex items-start gap-4 shadow-sm">
                 <div className="w-6 h-6 rounded-full bg-red-100 text-red-800 flex items-center justify-center shrink-0 mt-0.5 border border-red-200">
                   <span className="text-xs font-bold">!</span>
                 </div>
                 <p className="text-sm text-red-800 font-medium leading-relaxed">{error}</p>
               </div>
             )}
             
             <div className="glass-panel p-6 sm:p-8 md:p-10 shadow-lux-sm">
                {method === 'phone' ? (
                  <div className="space-y-8">
                    {!verificationId ? (
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-lux-text mb-3 block ml-1">Mobile Number</label>
                        <div className="flex items-center gap-3">
                          <div className="px-5 py-4 bg-lux-bg border border-lux-border rounded-2xl sm:rounded-3xl flex items-center gap-3 shadow-inner">
                             <img src="https://flagcdn.com/w20/za.png" alt="ZA" className="w-[22px] rounded-sm shadow-sm" />
                             <span className="font-bold text-lux-text tracking-wider">+27</span>
                          </div>
                          <input 
                            type="tel"
                            maxLength={9}
                            placeholder="71 234 5678"
                            className="flex-1 px-6 py-4 bg-lux-bg border border-lux-border rounded-2xl sm:rounded-3xl text-lg font-bold text-lux-text outline-none focus:border-lux-green-500 transition-all shadow-inner tracking-wider"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                          />
                        </div>
                        <Button 
                          className="w-full mt-8 h-14 rounded-2xl sm:rounded-3xl text-[11px] uppercase tracking-widest font-bold bg-lux-green-950 text-lux-bg hover:bg-lux-green-900 text-lux-surface shadow-lux-lg active:scale-95 transition-all"
                          onClick={handleSendOTP}
                          disabled={loading || phoneNumber.length !== 9}
                        >
                          {loading ? <Loader2 className="animate-spin mr-3" /> : 'Send Verification Code'}
                        </Button>
                        <div id="recaptcha-container"></div>
                      </div>
                    ) : (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: "easeOut" }}>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-lux-text mb-5 block text-center">Enter 6-digit confirmation code</label>
                        <div className="flex justify-between gap-3 mb-8">
                          {otp.map((digit, idx) => (
                            <input 
                              key={idx}
                              ref={(el) => { otpInputs.current[idx] = el; }}
                              type="text"
                              maxLength={1}
                              className="w-full h-16 bg-lux-bg border border-lux-border rounded-2xl sm:rounded-3xl text-2xl font-bold text-lux-text text-center outline-none focus:border-lux-green-500 transition-all shadow-inner"
                              value={digit}
                              onChange={(e) => handleOtpChange(idx, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(idx, e)}
                            />
                          ))}
                        </div>
                        <Button 
                          className="w-full h-14 rounded-2xl sm:rounded-3xl text-[11px] uppercase tracking-widest font-bold bg-lux-green-500 hover:bg-lux-green-500 hover:text-lux-text hover:border-lux-green-500-light text-lux-text shadow-lux-lg active:scale-95 transition-all mb-6"
                          onClick={handleVerifyOTP}
                          disabled={loading || otp.join('').length !== 6}
                        >
                          {loading ? <Loader2 className="animate-spin mr-3" /> : 'Verify & Enter'}
                        </Button>
                        
                        <div className="text-center">
                           {timer > 0 ? (
                             <p className="text-[10px] font-bold uppercase tracking-widest text-lux-text">Resend code in <span className="text-lux-green-500">{timer}s</span></p>
                           ) : (
                             <button 
                                onClick={() => { setVerificationId(null); setOtp(['','','','','','']); handleSendOTP(); }}
                                className="text-[10px] font-bold uppercase tracking-widest text-lux-green-900 border-b border-lux-border/30 hover:border-lux-green-500 hover:text-lux-green-500 transition-colors pb-1"
                              >
                                Resend Verification Code
                              </button>
                           )}
                        </div>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleEmailAuth} className="space-y-6">
                    {isRegistering && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-lux-text mb-2 block ml-1">Full Name</label>
                        <input 
                          type="text"
                          required={isRegistering}
                          className="w-full px-6 py-4 bg-lux-bg border border-lux-border rounded-2xl sm:rounded-3xl text-base font-medium text-lux-text outline-none focus:border-lux-green-500 transition-all shadow-inner placeholder:text-lux-text"
                          placeholder="Name and Surname"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                        />
                      </motion.div>
                    )}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-lux-text mb-2 block ml-1">Email Address (Optional)</label>
                      <input 
                        type="email"
                        required
                        className="w-full px-6 py-4 bg-lux-bg border border-lux-border rounded-2xl sm:rounded-3xl text-base font-medium text-lux-text outline-none focus:border-lux-green-500 transition-all shadow-inner placeholder:text-lux-text"
                        placeholder="scholar@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-lux-text mb-2 block ml-1">Passphrase</label>
                      <input 
                        type="password"
                        required
                        className="w-full px-6 py-4 bg-lux-bg border border-lux-border rounded-2xl sm:rounded-3xl text-base font-medium text-lux-text outline-none focus:border-lux-green-500 transition-all shadow-inner placeholder:text-lux-text"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <Button 
                      type="submit"
                      className="w-full h-14 mt-4 rounded-2xl sm:rounded-3xl text-[11px] uppercase tracking-widest font-bold bg-lux-green-950 text-lux-bg hover:bg-lux-green-900 text-lux-surface shadow-lux-lg active:scale-95 transition-all"
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="animate-spin mr-3" /> : isRegistering ? 'Enroll Account' : 'Authenticate'}
                    </Button>
                    
                    <button 
                      type="button"
                      onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
                      className="w-full text-center text-[10px] font-bold uppercase tracking-widest text-lux-text hover:text-lux-green-500 transition-colors mt-2"
                    >
                      {isRegistering ? 'Existing scholar? Authenticate' : 'New enrollment? Create account'}
                    </button>
                  </form>
                )}

                <div className="relative my-10">
                   <div className="absolute inset-0 flex items-center">
                     <div className="w-full border-t border-lux-border"></div>
                   </div>
                   <div className="relative flex justify-center">
                     <span className="bg-lux-surface px-4 text-[9px] uppercase tracking-widest font-bold text-lux-text">Alternative Access</span>
                   </div>
                </div>

                <div className="space-y-4">
                  <Button 
                    variant="outline"
                    className="w-full h-14 rounded-2xl sm:rounded-3xl flex items-center justify-center gap-3 border-lux-border hover:bg-lux-bg hover:border-lux-border text-[11px] uppercase tracking-widest font-bold text-lux-text transition-all"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                  </Button>
                  
                  <button 
                    onClick={() => navigate('/past-papers')}
                    className="w-full h-14 border border-lux-border border-dashed rounded-2xl sm:rounded-3xl text-[11px] uppercase tracking-widest font-bold text-lux-text hover:bg-lux-bg hover:text-lux-text transition-all flex items-center justify-center gap-3 group"
                  >
                    Enter as Guest <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
