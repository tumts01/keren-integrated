'use client';
import MappingFotoTab from './MappingFotoTab';
import withAuth from '@/lib/withAuth';

function MappingFotoPage() {
  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <MappingFotoTab />
      </div>
    </div>
  );
}

export default withAuth(MappingFotoPage, ['Super Admin', 'Admin', 'Guru']);
