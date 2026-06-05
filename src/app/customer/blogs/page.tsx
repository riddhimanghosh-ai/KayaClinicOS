'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';

export default function BlogsPage() {
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/customer/login');
    }
  }, [router]);

  const blogs = [
    {
      id: 1,
      title: '10 Skincare Tips for Acne-Prone Skin',
      category: 'Skincare',
      author: 'Dr. Priya Singh',
      date: '2026-05-20',
      excerpt: 'Discover the best practices to keep your acne-prone skin healthy and clear...',
      image: '📝',
    },
    {
      id: 2,
      title: 'Understanding Your Prescription: A Beginner\'s Guide',
      category: 'Medications',
      author: 'Dr. Rajesh Kumar',
      date: '2026-05-18',
      excerpt: 'Learn how to read and understand your prescription better...',
      image: '💊',
    },
    {
      id: 3,
      title: 'Anti-Aging Treatments: What Really Works',
      category: 'Treatments',
      author: 'Dr. Anjali Sharma',
      date: '2026-05-15',
      excerpt: 'Explore evidence-based anti-aging treatments and their effectiveness...',
      image: '✨',
    },
    {
      id: 4,
      title: 'Sun Protection: The Most Important Skincare Step',
      category: 'Skincare',
      author: 'Dr. Priya Singh',
      date: '2026-05-12',
      excerpt: 'Why SPF matters and how to choose the right sunscreen for you...',
      image: '☀️',
    },
    {
      id: 5,
      title: 'Dietary Changes That Support Skin Health',
      category: 'Lifestyle',
      author: 'Dr. Meera Patel',
      date: '2026-05-10',
      excerpt: 'Foods that can help improve your skin condition and overall health...',
      image: '🍎',
    },
    {
      id: 6,
      title: 'Laser Treatments: Benefits and What to Expect',
      category: 'Treatments',
      author: 'Dr. Vikram Das',
      date: '2026-05-08',
      excerpt: 'Complete guide to laser treatments and their results...',
      image: '⚡',
    },
  ];

  const categories = ['All', ...Array.from(new Set(blogs.map((b) => b.category)))];

  return (
    <div className="min-h-screen" style={{ background: 'var(--paper-grad)' }}>
      <header style={{ borderColor: 'var(--hair)', background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(6px)' }} className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="h2" style={{ color: 'var(--ink)' }}>Health &amp; Beauty Blog</h1>
          <Link href="/customer/dashboard" className="btn sm">
            Back
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Categories */}
        <div style={{ marginBottom: '32px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              style={{
                padding: '8px 16px',
                background: cat === 'All' ? 'var(--brand)' : 'white',
                border: `1px solid var(--hair)`,
                borderRadius: '999px',
                color: cat === 'All' ? 'white' : 'var(--ink)',
                fontWeight: 500,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--brand)';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.borderColor = 'var(--brand)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = cat === 'All' ? 'var(--brand)' : 'white';
                e.currentTarget.style.color = cat === 'All' ? 'white' : 'var(--ink)';
                e.currentTarget.style.borderColor = 'var(--hair)';
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Blog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {blogs.map((blog) => (
            <div key={blog.id} className="panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.15s ease' }}>
              <div style={{ background: 'var(--paper-2)', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', borderBottom: `1px solid var(--hair)` }}>
                {blog.image}
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <p style={{ fontSize: '10px', color: 'var(--mute)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>{blog.category}</p>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px', lineHeight: 1.3 }}>{blog.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--mute)', marginBottom: '12px', lineHeight: 1.4, flex: 1 }}>{blog.excerpt}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--mute-2)', paddingTop: '12px', borderTop: `1px solid var(--hair)` }}>
                  <span>By {blog.author}</span>
                  <span>{blog.date}</span>
                </div>
                <button style={{ marginTop: '12px', color: 'var(--brand)', fontWeight: 600, fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'none' }}>
                  Read More →
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Newsletter Signup */}
        <div className="panel" style={{ textAlign: 'center' }}>
          <h2 className="h3" style={{ color: 'var(--ink)', marginBottom: '12px' }}>📧 Stay Updated</h2>
          <p style={{ color: 'var(--mute)', marginBottom: '24px', fontSize: '14px' }}>Subscribe to our newsletter for weekly health tips and skincare advice</p>
          <div style={{ display: 'flex', gap: '12px', maxWidth: '400px', margin: '0 auto' }}>
            <input
              type="email"
              placeholder="Enter your email"
              style={{ flex: 1, padding: '12px 16px', border: `1px solid var(--hair)`, borderRadius: 'var(--r-2)', color: 'var(--ink)', fontSize: '13px' }}
            />
            <button className="btn">Subscribe</button>
          </div>
        </div>
      </div>
    </div>
  );
}
