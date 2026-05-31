# Maintainer: hasan <hasan@hasan.jp>
# Contributor: hasan <hasan@hasan.jp>
pkgname=k11s
pkgver=0.1.0
pkgrel=1
pkgdesc="Kubernetes desktop client inspired by k9s"
arch=('x86_64')
url="https://github.com/htekgulds/k11s"
license=("MIT")
depends=('gtk3' 'libsoup3' 'webkit2gtk-4.1' 'librsvg')
makedepends=('binutils')
source=("${pkgname}_${pkgver}_amd64.deb::${url}/releases/download/v${pkgver}/${pkgname}_${pkgver}_amd64.deb")
sha256sums=('SKIP')

package() {
  bsdtar -xf "${srcdir}/${pkgname}_${pkgver}_amd64.deb" -C "${pkgdir}" 2>/dev/null || {
    ar x "${srcdir}/${pkgname}_${pkgver}_amd64.deb"
    bsdtar -xf data.tar.zst -C "${pkgdir}"
    bsdtar -xf data.tar.xz -C "${pkgdir}" 2>/dev/null || true
    bsdtar -xf data.tar.gz -C "${pkgdir}" 2>/dev/null || true
  }
}
