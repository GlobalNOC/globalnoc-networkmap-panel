Name: grnoc-grafana-worldview
Version: 1.0.2
Release: 1%{?dist}
Summary: GRNOC Worldview Grafana Plugin
Group: GRNOC
License: GRNOC
URL: http://globalnoc.iu.edu
Source0: %{name}-%{version}.tar.gz
BuildRoot: %{_tmppath}/%{name}-%{version}-%{release}-root
BuildArch: noarch

BuildRequires: nodejs

%description
GRNOC Worldview Grafana Plugin

%prep
%setup -q

%build
npm i
gulp

%install
rm -rf $RPM_BUILD_ROOT
%{__install} -d -p -m 0755 %{buildroot}/var/lib/grafana/plugins/worldview

cp -r dist %{buildroot}/var/lib/grafana/plugins/worldview/dist

find ./dist -type f -name '*' | sed 's:\./:/var/lib/grafana/plugins/worldview/:g' > $RPM_BUILD_DIR/file.list.%{name}

%clean
rm -rf $RPM_BUILD_ROOT
%files -f ../file.list.%{name}
%defattr(-,grafana,grafana,-)

