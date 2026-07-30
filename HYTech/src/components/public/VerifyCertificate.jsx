import React, { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
import { functions } from '../../firebase';

const VerifyCertificate = () => {
  const { token } = useParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const verify = async () => {
      try {
        const call = httpsCallable(functions, 'verifyCertificate');
        const response = await call({ verificationToken: token });
        if (active) setResult(response.data);
      } catch {
        if (active) setError('This certificate could not be verified.');
      }
    };
    verify();
    return () => { active = false; };
  }, [token]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16">
      <section className="mx-auto max-w-xl rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
        <img src="/images/hyt_logo.png" alt="HYTech" className="mx-auto h-16 w-auto" />
        <h1 className="mt-6 text-center text-2xl font-bold text-slate-900">
          Certificate verification
        </h1>
        {!result && !error && (
          <p className="mt-6 text-center text-slate-600" role="status">Checking certificate…</p>
        )}
        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 p-5 text-red-800" role="alert">
            <XCircle className="mb-2 h-7 w-7" />
            {error}
          </div>
        )}
        {result && (!result.found || !result.valid) && (
          <div className="mt-6 rounded-2xl bg-red-50 p-5 text-red-800" role="status">
            <XCircle className="mb-2 h-7 w-7" />
            This certificate is {result.found ? result.status : 'not recognized'}.
          </div>
        )}
        {result?.valid && (
          <div className="mt-6 rounded-2xl bg-emerald-50 p-5 text-emerald-900" role="status">
            <CheckCircle className="mb-3 h-8 w-8" />
            <p className="font-semibold">Valid HYTech certificate</p>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt>Certificate</dt><dd className="font-medium">{result.certificateNumber}</dd>
              <dt>Trainee</dt><dd className="font-medium">{result.studentName}</dd>
              <dt>Class</dt><dd className="font-medium">{result.className}</dd>
              <dt>Issued</dt>
              <dd className="font-medium">
                {result.issuedAt ? new Date(result.issuedAt).toLocaleDateString() : 'Recorded'}
              </dd>
            </dl>
          </div>
        )}
        <Link to="/" className="mt-8 block text-center text-sm font-medium text-indigo-700">
          Return to HYTech
        </Link>
      </section>
    </main>
  );
};

export default VerifyCertificate;
