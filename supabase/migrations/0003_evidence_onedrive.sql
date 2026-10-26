-- Evidence SMEn dipindah dari Google Drive ke folder OneDrive (26 Okt 2026).
update dokumen_audit
set link_eksternal = 'https://1drv.ms/f/c/0b4f3d49ee2d73a3/IgCR3a7n5EGZQZzBbGtsTiCnAX7VCb1zZ0Kmq82xuJbNhjY?e=GzK8c4'
where link_eksternal like 'https://drive.google.com/%';
