'use client';

import { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import styles from './page.module.css';
import InlineLoading from '@/components/InlineLoading';
import LockedMenuPlaceholder from '@/components/LockedMenuPlaceholder';

interface UserData {
  id: number;
  nama: string;
  username: string;
  role: string;
  foto?: string;
  rawFoto?: string;
  sudahGanti: boolean;
  terakhirLogin: string;
  whatsapp?: string;
}

export default function UserGuruPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('semua');
  const [filterStatus, setFilterStatus] = useState('semua');

  // Edit Modal State
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Check user auth & role
    const userStr = localStorage.getItem('keren_user_data');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        const role = (u.role || '').toLowerCase();
        if (role === 'admin' || role === 'pimpinan') {
          setIsAdmin(true);
        }
      } catch (e) {
        console.error(e);
      }
    }
    setCheckingAuth(false);
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setUsers(data.data);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Memuat Data',
          text: data.error || 'Terjadi kesalahan saat memuat data user.'
        });
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Koneksi Terputus',
        text: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  // Distinct roles for filter dropdown
  const availableRoles = useMemo(() => {
    const roles = new Set<string>();
    users.forEach(u => {
      if (u.role) roles.add(u.role);
    });
    return Array.from(roles).sort();
  }, [users]);

  // Filtered and searched users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Role filter
      if (filterRole !== 'semua' && u.role !== filterRole) {
        return false;
      }
      // Status filter
      if (filterStatus === 'sudah' && !u.sudahGanti) {
        return false;
      }
      if (filterStatus === 'belum' && u.sudahGanti) {
        return false;
      }
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = u.nama.toLowerCase().includes(q);
        const matchUser = u.username.toLowerCase().includes(q);
        const matchRole = u.role.toLowerCase().includes(q);
        return matchName || matchUser || matchRole;
      }
      return true;
    });
  }, [users, filterRole, filterStatus, search]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const sudah = users.filter(u => u.sudahGanti).length;
    const belum = total - sudah;
    const aktif = users.filter(u => u.terakhirLogin && u.terakhirLogin !== '').length;

    const persenSudah = total > 0 ? Math.round((sudah / total) * 100) : 0;
    const persenBelum = total > 0 ? Math.round((belum / total) * 100) : 0;

    return { total, sudah, belum, aktif, persenSudah, persenBelum };
  }, [users]);

  // Open modal handler
  const handleOpenEdit = (user: UserData) => {
    setSelectedUser(user);
    setNewUsername(user.username);
  };

  // Close modal
  const handleCloseModal = () => {
    setSelectedUser(null);
    setNewUsername('');
    setSaving(false);
  };

  // Copy to clipboard helper
  const handleCopyUsername = (uname: string) => {
    navigator.clipboard.writeText(uname);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `Username '${uname}' disalin!`,
      showConfirmButton: false,
      timer: 1800
    });
  };

  // Generate username suggestions based on teacher's name
  const suggestions = useMemo(() => {
    if (!selectedUser) return [];
    const cleanName = selectedUser.nama
      .replace(/^(H\.|Hj\.|Drs\.|Dra\.|Dr\.|Ir\.|M\.)\s+/gi, '') // Remove prefix titles
      .replace(/,\s*[A-Za-z\.\s]+$/g, '') // Remove academic degrees like , S.Pd., M.H.
      .trim();

    const parts = cleanName.split(/\s+/).filter(Boolean);
    const list: string[] = [];

    if (parts.length > 0) {
      // First name lowercase
      list.push(parts[0].toLowerCase());
    }
    if (parts.length > 1) {
      // Combined initials + last name
      list.push((parts[0][0] + parts[parts.length - 1]).toLowerCase());
      // First + last
      list.push((parts[0] + parts[parts.length - 1]).toLowerCase());
    }
    // Random 2 digit number
    if (parts.length > 0) {
      list.push(`${parts[0].toLowerCase()}${new Date().getFullYear().toString().slice(-2)}`);
    }

    return Array.from(new Set(list)).slice(0, 4);
  }, [selectedUser]);

  // Submit update username
  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const trimmed = newUsername.trim();
    if (!trimmed) {
      Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Username baru tidak boleh kosong.' });
      return;
    }
    if (trimmed.length < 3) {
      Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Username minimal 3 karakter.' });
      return;
    }
    if (/\s/.test(trimmed)) {
      Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Username tidak boleh mengandung spasi.' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/user/update-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          oldUsername: selectedUser.username,
          newUsername: trimmed
        })
      });

      const result = await res.json();
      if (result.success) {
        // Update local state
        setUsers(prev =>
          prev.map(u =>
            u.id === selectedUser.id
              ? { ...u, username: trimmed, sudahGanti: true }
              : u
          )
        );

        const updatedUser = { ...selectedUser, username: trimmed };
        handleCloseModal();

        // Show success modal with WhatsApp share option
        Swal.fire({
          icon: 'success',
          title: 'Username Berhasil Diubah!',
          html: `
            <div style="text-align: left; background: #f8fafc; padding: 14px; border-radius: 10px; margin-top: 10px; font-size: 0.92rem;">
              <p style="margin: 0 0 6px 0;"><strong>Nama Guru:</strong> ${updatedUser.nama}</p>
              <p style="margin: 0 0 6px 0;"><strong>Username Baru:</strong> <code style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px; font-weight: bold; color: #047857; font-size: 1.05rem;">${trimmed}</code></p>
              <p style="margin: 0; color: #64748b; font-size: 0.85rem;">Guru dapat langsung login ke aplikasi KEREN menggunakan username ini.</p>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: '<i class="fab fa-whatsapp"></i> Kirim info via WhatsApp',
          confirmButtonColor: '#16a34a',
          cancelButtonText: 'Selesai',
          cancelButtonColor: '#64748b'
        }).then(btnResult => {
          if (btnResult.isConfirmed) {
            let phone = (updatedUser.whatsapp || '').replace(/[^0-9]/g, '');
            if (phone.startsWith('0')) {
              phone = '62' + phone.slice(1);
            }
            const pesan = encodeURIComponent(
              `Assalamu'alaikum Wr. Wb.\nBapak/Ibu *${updatedUser.nama}*,\n\nBerikut informasi username login akun KEREN Anda yang telah diperbarui:\n\n👤 *Username:* ${trimmed}\n🌐 *Link Aplikasi:* https://keren.mtsalmaarif01.sch.id\n\nSilakan dicoba login. Terima kasih.`
            );
            const waLink = phone
              ? `https://wa.me/${phone}?text=${pesan}`
              : `https://wa.me/?text=${pesan}`;
            window.open(waLink, '_blank');
          }
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Mengubah Username',
          text: result.error || 'Terjadi kesalahan pada server.'
        });
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Koneksi Terputus',
        text: 'Gagal menghubungi server saat memperbarui username.'
      });
    } finally {
      setSaving(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (users.length === 0) {
      Swal.fire({ icon: 'info', title: 'Data Kosong', text: 'Tidak ada data user untuk diekspor.' });
      return;
    }

    const rows = filteredUsers.map((u, idx) => ({
      'No': idx + 1,
      'Nama Guru / GTK': u.nama,
      'Role / Jabatan': u.role,
      'Username Login': u.username,
      'Status Ganti Username': u.sudahGanti ? 'Sudah Ganti' : 'Default',
      'Terakhir Login': u.terakhirLogin || 'Belum Pernah',
      'No WhatsApp': u.whatsapp || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'User Login Guru');

    // Auto-fit column widths
    const maxCols = Object.keys(rows[0] || {}).map(key => ({
      wch: Math.max(key.length + 4, 16)
    }));
    worksheet['!cols'] = maxCols;

    XLSX.writeFile(workbook, `User_Login_Guru_KEREN_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // If checking authentication
  if (checkingAuth) {
    return (
      <div className={styles.container}>
        <InlineLoading message="Memeriksa hak akses admin..." />
      </div>
    );
  }

  // Restricted Access if not Admin
  if (!isAdmin) {
    return <LockedMenuPlaceholder title="User Login Guru" icon="fa-user-lock" />;
  }

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.adminBadge}>
            <i className="fas fa-shield-alt"></i> Khusus Admin
          </div>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>
              <i className="fas fa-user-lock"></i>
            </span>
            User Login Guru
          </h1>
          <p className={styles.subtitle}>
            Kelola dan pantau username login akun aplikasi KEREN untuk seluruh Guru dan Tenaga Kependidikan (GTK).
          </p>
        </div>

        <div className={styles.actionsArea}>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className={styles.btnSecondary}
            title="Muat ulang data dari database"
          >
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExportExcel}
            disabled={loading || users.length === 0}
            className={styles.btnPrimary}
            title="Unduh daftar user ke file Excel"
          >
            <i className="fas fa-file-excel"></i>
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#e0e7ff', color: '#4338ca' }}>
            <i className="fas fa-users"></i>
          </div>
          <div className={styles.statInfo}>
            <h4>Total User GTK</h4>
            <div className={styles.statNumber}>{stats.total}</div>
            <div className={styles.statSub}>Akun guru & staf aktif</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#dcfce7', color: '#15803d' }}>
            <i className="fas fa-circle-check"></i>
          </div>
          <div className={styles.statInfo}>
            <h4>Sudah Ganti Username</h4>
            <div className={styles.statNumber}>
              {stats.sudah}{' '}
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#15803d' }}>
                ({stats.persenSudah}%)
              </span>
            </div>
            <div className={styles.statSub}>Telah mengubah kredensial</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fef3c7', color: '#b45309' }}>
            <i className="fas fa-circle-exclamation"></i>
          </div>
          <div className={styles.statInfo}>
            <h4>Username Masih Default</h4>
            <div className={styles.statNumber}>
              {stats.belum}{' '}
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#b45309' }}>
                ({stats.persenBelum}%)
              </span>
            </div>
            <div className={styles.statSub}>Belum pernah diganti</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#e0f2fe', color: '#0369a1' }}>
            <i className="fas fa-arrow-right-to-bracket"></i>
          </div>
          <div className={styles.statInfo}>
            <h4>Pernah Login</h4>
            <div className={styles.statNumber}>{stats.aktif}</div>
            <div className={styles.statSub}>Tercatat memiliki riwayat sesi</div>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className={styles.card}>
        {/* Filter Controls */}
        <div className={styles.filterBar}>
          <div className={styles.searchWrapper}>
            <i className={`fas fa-search ${styles.searchIcon}`}></i>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Cari nama guru atau username login..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className={styles.filterGroup}>
            <select
              className={styles.selectInput}
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
            >
              <option value="semua">Semua Role / Jabatan</option>
              {availableRoles.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <select
              className={styles.selectInput}
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="semua">Semua Status Ganti</option>
              <option value="sudah">Sudah Ganti Username</option>
              <option value="belum">Masih Default</option>
            </select>
          </div>
        </div>

        {/* Content Table or Loading */}
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <InlineLoading message="Memuat daftar user guru & kredensial login..." />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
            <i className="fas fa-user-slash fa-3x" style={{ color: '#cbd5e1', marginBottom: '14px' }}></i>
            <h3 style={{ fontSize: '1.15rem', color: '#1e293b', margin: '0 0 6px 0', fontWeight: 700 }}>
              Tidak Ada User yang Cocok
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              Coba sesuaikan kata kunci pencarian atau reset filter role/status di atas.
            </p>
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>No</th>
                  <th>Nama Guru & GTK</th>
                  <th>Role / Jabatan</th>
                  <th>Username Login</th>
                  <th>Status Username</th>
                  <th>Terakhir Login</th>
                  <th style={{ textAlign: 'center', width: '130px' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, idx) => {
                  const initial = u.nama.charAt(0).toUpperCase() || 'G';
                  return (
                    <tr key={u.id || idx}>
                      <td style={{ textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>
                        {idx + 1}
                      </td>

                      <td>
                        <div className={styles.userCell}>
                          {u.foto ? (
                            <img
                              src={u.foto}
                              alt={u.nama}
                              className={styles.avatar}
                              onError={e => {
                                // Fallback jika thumbnail gdrive gagal load
                                (e.target as HTMLElement).style.display = 'none';
                                const sibling = (e.target as HTMLElement).nextElementSibling;
                                if (sibling) (sibling as HTMLElement).style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            className={styles.avatarFallback}
                            style={{ display: u.foto ? 'none' : 'flex' }}
                          >
                            {initial}
                          </div>

                          <div>
                            <div className={styles.userName}>{u.nama}</div>
                            {u.whatsapp && (
                              <div className={styles.userSub}>
                                <i className="fab fa-whatsapp" style={{ color: '#16a34a', marginRight: '4px' }}></i>
                                {u.whatsapp}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={styles.badgeRole}>
                          {u.role || 'GTK'}
                        </span>
                      </td>

                      <td>
                        <div className={styles.usernamePill}>
                          <span>{u.username}</span>
                          <button
                            type="button"
                            className={styles.btnCopy}
                            title="Salin username ke clipboard"
                            onClick={() => handleCopyUsername(u.username)}
                          >
                            <i className="fas fa-copy"></i>
                          </button>
                        </div>
                      </td>

                      <td>
                        {u.sudahGanti ? (
                          <span className={styles.badgeSuccess}>
                            <i className="fas fa-check-circle"></i> Sudah Ganti
                          </span>
                        ) : (
                          <span className={styles.badgeWarning}>
                            <i className="fas fa-clock"></i> Default
                          </span>
                        )}
                      </td>

                      <td style={{ color: u.terakhirLogin ? '#334155' : '#94a3b8', fontSize: '0.84rem' }}>
                        {u.terakhirLogin ? (
                          <span>
                            <i className="fas fa-history" style={{ marginRight: '5px', color: '#64748b' }}></i>
                            {u.terakhirLogin}
                          </span>
                        ) : (
                          <span>Belum pernah</span>
                        )}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className={styles.btnEdit}
                          onClick={() => handleOpenEdit(u)}
                          title="Ubah username login guru ini"
                        >
                          <i className="fas fa-edit"></i>
                          <span>Ubah</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Username Modal */}
      {selectedUser && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>
                <i className="fas fa-user-edit" style={{ color: '#047857' }}></i>
                Ubah Username Guru
              </h3>
              <button
                type="button"
                className={styles.btnCloseModal}
                onClick={handleCloseModal}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSubmitUpdate}>
              <div className={styles.modalBody}>
                {/* Target User Details */}
                <div className={styles.userTargetInfo}>
                  <div className={styles.avatarFallback}>
                    {selectedUser.nama.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.98rem' }}>
                      {selectedUser.nama}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
                      Role: <strong>{selectedUser.role}</strong> | Username Saat Ini: <code style={{ color: '#047857', fontWeight: 'bold' }}>{selectedUser.username}</code>
                    </div>
                  </div>
                </div>

                {/* Input Username Baru */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Username Baru <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="Contoh: ahmad_fauzi atau fauzi24"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value.replace(/\s/g, ''))}
                    required
                    autoFocus
                  />
                  
                  {/* Suggestions Pills */}
                  {suggestions.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Saran cepat: </span>
                      <div className={styles.suggestionsWrapper}>
                        {suggestions.map((sug, i) => (
                          <button
                            key={i}
                            type="button"
                            className={styles.suggestionPill}
                            onClick={() => setNewUsername(sug)}
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Info Note */}
                <div className={styles.infoNote}>
                  <i className="fas fa-info-circle" style={{ fontSize: '1.1rem', marginTop: '2px' }}></i>
                  <div>
                    Setelah disimpan, username lama tidak berlaku lagi. Guru bersangkutan dapat langsung login ke aplikasi KEREN menggunakan username baru ini.
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={handleCloseModal}
                  disabled={saving}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={saving || !newUsername.trim() || newUsername.trim() === selectedUser.username}
                >
                  {saving ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check"></i>
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
