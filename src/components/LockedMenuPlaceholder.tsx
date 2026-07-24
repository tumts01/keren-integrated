'use client';

type Props = {
  title: string;
  icon: string;
};

export default function LockedMenuPlaceholder({ title, icon }: Props) {
  const waUrl = `https://wa.me/628970434000?text=${encodeURIComponent(
    `Halo Aa' Icoll 👋, mohon bantuannya untuk mengaktifkan menu *${title}* di aplikasi KEREN 🙏✨`
  )}`;

  return (
    <div style={{
      minHeight: '75vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 50%, #e0f2fe 100%)',
        borderRadius: '28px',
        padding: '48px 32px',
        maxWidth: '560px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 50px rgba(14, 165, 233, 0.15), 0 10px 20px rgba(34, 197, 94, 0.1)',
        border: '3px dashed #38bdf8',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative Floating Emojis */}
        <div style={{ position: 'absolute', top: '16px', left: '20px', fontSize: '1.8rem', opacity: 0.8, animation: 'bounce 2s infinite' }}>✨</div>
        <div style={{ position: 'absolute', top: '24px', right: '24px', fontSize: '1.8rem', opacity: 0.8, animation: 'bounce 2.5s infinite' }}>🔒</div>
        <div style={{ position: 'absolute', bottom: '20px', left: '24px', fontSize: '1.8rem', opacity: 0.8, animation: 'bounce 2.2s infinite' }}>💖</div>
        <div style={{ position: 'absolute', bottom: '20px', right: '20px', fontSize: '1.8rem', opacity: 0.8, animation: 'bounce 1.8s infinite' }}>🚀</div>

        {/* Icon Badge */}
        <div style={{
          width: '90px',
          height: '90px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #0ea5e9, #22c55e)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 12px 28px rgba(14, 165, 233, 0.35)',
          color: 'white',
          fontSize: '2.5rem'
        }}>
          <i className={`fas ${icon}`}></i>
        </div>

        {/* Menu Title */}
        <div style={{
          display: 'inline-block',
          background: '#e0f2fe',
          color: '#0284c7',
          fontWeight: 700,
          fontSize: '0.9rem',
          padding: '6px 16px',
          borderRadius: '20px',
          marginBottom: '16px'
        }}>
          Menu {title} 📌
        </div>

        {/* Big Catchy Text */}
        <h1 style={{
          fontSize: '1.8rem',
          fontWeight: 900,
          lineHeight: 1.4,
          color: '#0f172a',
          margin: '0 0 16px 0'
        }}>
          Hubungi <span style={{
            background: 'linear-gradient(135deg, #2563eb, #16a34a)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>Aa' Icol</span> jika ingin mengaktifkan Menu ini! 📲💬✨
        </h1>

        <p style={{
          color: '#64748b',
          fontSize: '0.95rem',
          marginBottom: '28px',
          lineHeight: 1.6
        }}>
          Fitur ini masih terkunci atau belum diaktifkan untuk akun Anda. Jangan ragu buat chat Aa' Icol yaa biar segera disiapkan! 🥰🙌
        </p>

        {/* WA Contact Button */}
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: 'white',
            fontWeight: 800,
            fontSize: '1.05rem',
            padding: '16px 32px',
            borderRadius: '50px',
            textDecoration: 'none',
            boxShadow: '0 10px 25px rgba(34, 197, 94, 0.4)',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 14px 30px rgba(34, 197, 94, 0.5)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 10px 25px rgba(34, 197, 94, 0.4)';
          }}
        >
          <i className="fab fa-whatsapp" style={{ fontSize: '1.4rem' }}></i>
          Chat Aa' Icol di WhatsApp 💌
        </a>
      </div>
    </div>
  );
}
