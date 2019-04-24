NAME = grnoc-grafana-worldview
VERSION = 1.1.1

rpm:    dist
		rpmbuild -ta dist/$(NAME)-$(VERSION).tar.gz
clean:
		rm -rf dist/$(NAME)-$(VERSION)/
		rm -rf dist
dist:
		rm -rf dist/$(NAME)-$(VERSION)/
		mkdir -p dist/$(NAME)-$(VERSION)/
		cp -r src package.json gulpfile.js $(NAME).spec dist/$(NAME)-$(VERSION)/
		cd dist; tar -czvf $(NAME)-$(VERSION).tar.gz $(NAME)-$(VERSION)/ --exclude .svn
