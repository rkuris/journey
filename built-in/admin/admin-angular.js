// TODO: Split this Angular app into a proper directory structure

//register the modules
var adminApp = angular.module('adminApp', ['ngRoute', 'frapontillo.bootstrap-switch', 'ui.bootstrap', 'infinite-scroll']);

adminApp.config(function($routeProvider) {
  $routeProvider.
    when('/', {
      templateUrl: '/admin/content.html',
      controller: 'ContentCtrl'
    }).
    when('/edit/:ID', {
      templateUrl: '/admin/post.html',
      controller: 'EditCtrl'
    }).
    when('/create', {
      templateUrl: '/admin/post.html',
      controller: 'CreateCtrl'
    }).
    when('/settings', {
      templateUrl: '/admin/settings.html',
      controller: 'SettingsCtrl'
    }).
    otherwise({
      redirectTo: '/'
  });
});

//service for sharing the markdown content across controllers
adminApp.factory('sharingService', function(){
  return {
    shared: {
      post: {},
      blog: {},
      user: {},
      infiniteScrollFactory: null,
      selected: ''
    }
  }
});

//directive to handle visual selection of images
adminApp.directive('imgSelectionDirective', function() {
    return {
        restrict: 'A',
        link: function(scope, elem, attrs) {
          $(elem).click(function() {
            $('.imgselected').removeClass('imgselected');
            $(elem).children('img').addClass('imgselected');
          });
      }
    }
});

//directive to add/remove the blog url to/from the navigation url fields
adminApp.directive('evaluateUrl', function() {
  return {
    require: 'ngModel',
    link: function(scope, elem, attrs, ctrl) {
      elem.on('blur', function() {
        var value = elem.val();
        //if the url of this item doesn't start with http/https, add the blog url to it.
        if (!(value.substring(0, 'http://'.length) === 'http://') && !(value.substring(0, 'https://'.length) === 'https://') && !(value.substring(0, scope.shared.blog.Url.length) === scope.shared.blog.Url)) {
          if ((value.substring(0, 1) != '/') && (scope.shared.blog.Url.slice(-1) != '/')) {
            value = '/' + value;
          }
          value = scope.shared.blog.Url + value;
          elem.val(value);
        }
      });
    }
  };
});

//factory to load items in infinite-scroll
adminApp.factory('infiniteScrollFactory', function($http) {
  var infiniteScrollFactory = function(url) {
    this.url = url;
    this.items = [];
    this.busy = false;
    this.after = 1;
  };

  infiniteScrollFactory.prototype.nextPage = function() {
    if (this.busy) return;
    this.busy = true;
    var url = this.url + this.after;
    $http.get(url).then(function(response) {
      var items = response.data;
      for (var i = 0; i < items.length; i++) {
        this.items.push(items[i]);
      }
      this.after = this.after + 1;
      if (response.data.length > 0) this.busy = false;
    }.bind(this), function(error) {console.log(error)});
  };
  return infiniteScrollFactory;
});


adminApp.controller('ContentCtrl', function ($scope, $http, $sce, $location, infiniteScrollFactory, sharingService){
  //change the navbar according to controller
  $scope.navbarHtml = $sce.trustAsHtml('<ul class="nav navbar-nav"><li class="active"><a href="#!/">Content<span class="sr-only">(current)</span></a></li><li><a href="#!/create">New Post</a></li><li><a href="#!/settings">Settings</a></li><li><a href="/admin/logout" class="logout">( Log Out )</a></li></ul>');
  $scope.infiniteScrollFactory = new infiniteScrollFactory('/admin/api/posts/');
  $scope.openPost = function(postId) {
    $location.url('/edit/' + postId);
  };
  $scope.deletePost = function(postId, postTitle) {
    if (confirm('Are you sure you want to delete the post "' + postTitle + '"?')) {
      $http.delete('/admin/api/post/' + postId).then(function(response) {
        //delete post from array
        for (var i = 0; i < $scope.infiniteScrollFactory.items.length; i++) {
          if($scope.infiniteScrollFactory.items[i].Id == postId) {
            $scope.infiniteScrollFactory.items.splice(i, 1);
          }
        }
      }, function(error) { console.log(error) });
    }
  };
});

adminApp.controller('SettingsCtrl', function ($scope, $http, $timeout, $sce, $location, sharingService){
  //change the navbar according to controller
  $scope.navbarHtml = $sce.trustAsHtml('<ul class="nav navbar-nav"><li><a href="#!/">Content<span class="sr-only">(current)</span></a></li><li><a href="#!/create">New Post</a></li><li class="active"><a href="#!/settings">Settings</a></li><li><a href="/admin/logout" class="logout">( Log Out )</a></li></ul>');
  $scope.shared = sharingService.shared;
  //variable to hold the field prefix
  $scope.prefix = '';
  $scope.loadData = function() {
    $http.get('/admin/api/blog').then(function(response) {
      $scope.shared.blog = response.data;
      //select active theme
      var themeIndex = $scope.shared.blog.Themes.indexOf($scope.shared.blog.ActiveTheme);
      $scope.shared.blog.ActiveTheme = $scope.shared.blog.Themes[themeIndex];
      //make sure NavigationItems is not null
      if ($scope.shared.blog.NavigationItems == null) {
        $scope.shared.blog.NavigationItems = []
      }
      //append the blog url to the navigation items if necessary
      for (var i = 0; i < $scope.shared.blog.NavigationItems.length; i++) {
        var value = $scope.shared.blog.NavigationItems[i].url;
        //if the url of this item doesn't start with http/https, add the blog url to it.
        if (!(value.substring(0, 'http://'.length) === 'http://') && !(value.substring(0, 'https://'.length) === 'https://') && !(value.substring(0, $scope.shared.blog.Url.length) === $scope.shared.blog.Url)) {
          if ((value.substring(0, 1) != '/') && ($scope.shared.blog.Url.slice(-1) != '/')) {
            value = '/' + value;
          }
          value = $scope.shared.blog.Url + value;
          $scope.shared.blog.NavigationItems[i].url = value;
        }
      }
    }, function(error) { console.log(error) });
    $http.get('/admin/api/userid').then(function(response) {
      $scope.authenticatedUser = response.data;
      $http.get('/admin/api/user/' + $scope.authenticatedUser.Id).then(function(response) {
        $scope.shared.user = response.data;
      }, function(error) { console.log(error) });
    }, function(error) { console.log(error) });
  };
  $scope.loadData();
  $scope.deleteNavItem = function(index) {
    $scope.shared.blog.NavigationItems.splice(index, 1);
  };
  $scope.addNavItem = function() {
    var url = $scope.shared.blog.Url
    if (url.slice(-1) != '/') {
      url = url + '/';
    }
    $scope.shared.blog['NavigationItems'].push({label: 'Home', url: url});
  };
  $scope.save = function() {
    $http.patch('/admin/api/blog', $scope.shared.blog);
    $http.patch('/admin/api/user', $scope.shared.user).then(function(data) {
      $location.url('/');
    }, function(error) { console.log(error) });
  };
});

adminApp.controller('CreateCtrl', function ($scope, $http, $sce, $location, sharingService){
  //create markdown converter
  var converter = new showdown.Converter({extensions: ['footnotes'], ghCodeBlocks: true, simplifiedAutoLink: true, strikethrough: true, tables: true});
  //change the navbar according to controller
  $scope.navbarHtml = $sce.trustAsHtml('<ul class="nav navbar-nav"><li><a href="#!/">Content<span class="sr-only">(current)</span></a></li><li class="active"><a href="#!/create">New Post</a></li><li><a href="#!/settings">Settings</a></li><li><a href="/admin/logout" class="logout">( Log Out )</a></li></ul>');
  $scope.shared = sharingService.shared;
  $scope.shared.post = {Title: 'New Post', Slug: '', Markdown: 'Write something!', IsPublished: false, Image: '', Tags: ''}
  $scope.change = function() {
    document.getElementById('html-div').innerHTML = '<h1>' + $scope.shared.post.Title + '</h1><br>' + converter.makeHtml($scope.shared.post.Markdown);
    //resize the markdown textarea
    $('.textarea-autosize').val($scope.shared.post.Markdown).trigger('input');
  };
  $scope.change();
  $scope.save = function() {
    $('#post-save-button').attr('disabled', 'true');
    $http.post('/admin/api/post', $scope.shared.post).then(function(data) {
      $location.url('/');
    }, function(error) { console.log(error) });
  };
});

adminApp.controller('EditCtrl', function ($scope, $routeParams, $http, $sce, $location, sharingService){
  //create markdown converter
  var converter = new showdown.Converter({extensions: ['footnotes'], ghCodeBlocks: true, simplifiedAutoLink: true, strikethrough: true, tables: true});
  //change the navbar according to controller (nothing is active here, so strange)
  $scope.navbarHtml = $sce.trustAsHtml('<ul class="nav navbar-nav"><li><a href="#!/">Content<span class="sr-only">(current)</span></a></li><li><a href="#!/create">New Post</a></li><li><a href="#!/settings">Settings</a></li><li><a href="/admin/logout" class="logout">( Log Out )</a></li></ul>');
  $scope.shared = sharingService.shared;
  $scope.shared.post = {}
  $scope.change = function() {
    document.getElementById('html-div').innerHTML = '<h1>' + $scope.shared.post.Title + '</h1><br>' + converter.makeHtml($scope.shared.post.Markdown);
    //resize the markdown textarea
    $('.textarea-autosize').val($scope.shared.post.Markdown).trigger('input');
  };
  $http.get('/admin/api/post/' + $routeParams.ID).then(function(response) {
    $scope.shared.post = response.data;
    $scope.change();
  }, function(error) { console.log(error) });
  $scope.save = function() {
    $('#post-save-button').attr('disabled', 'true');
    $http.patch('/admin/api/post', $scope.shared.post).then(function(data) {
      $('#post-save-button').removeAttr('disabled');
    }, function(error) { console.log(error) });
  };
});

//modal for post options and help
adminApp.controller('EmptyModalCtrl', function ($scope, $uibModal, $http, sharingService) {
  $scope.shared = sharingService.shared;
  $scope.deleteCover = function() {
    $scope.shared.post.Image = '';
  };
  $scope.open = function (size, callingFrom) {
    if (callingFrom == 'post-options') {
      var modalInstance = $uibModal.open({
        templateUrl: '/admin/post-options-modal.tpl',
        controller: 'EmptyModalInstanceCtrl',
        size: size
      });
    } else if (callingFrom == 'post-help') {
      var modalInstance = $uibModal.open({
        templateUrl: '/admin/post-help-modal.tpl',
        controller: 'EmptyModalInstanceCtrl',
        size: size
      });
    }
    modalInstance.result.then(function (selectedItem) {
      if (callingFrom == 'post-cover') {
        $scope.selected = selectedItem;
        $scope.shared.post.Image = $scope.selected;
      }
    });
  };
});

//modal for image selection and upload
adminApp.controller('ImageModalCtrl', function ($scope, $uibModal, $http, sharingService, infiniteScrollFactory) {
  $scope.shared = sharingService.shared;
  $scope.shared.infiniteScrollFactory = new infiniteScrollFactory('/admin/api/images/');
  $scope.shared.infiniteScrollFactory.nextPage();
  $scope.open = function (size, callingFrom) {
    //image modal
    var modalInstance = $uibModal.open({
      templateUrl: '/admin/image-modal.tpl',
      controller: 'ImageModalInstanceCtrl',
      size: size
    });
    modalInstance.result.then(function (selectedItem) {
      if (callingFrom == 'post-image') {
        $scope.selected = selectedItem;
        $scope.shared.post.Markdown = $scope.shared.post.Markdown + '\n\n![](' + $scope.selected + ')\n\n';
        $scope.change(); //we invoke the change function of CreateCtrl or EditCtrl to update the html view.
      } else if (callingFrom == 'post-cover') {
        $scope.selected = selectedItem;
        $scope.shared.post.Image = $scope.selected;
      } else if (callingFrom == 'blog-logo') {
        $scope.selected = selectedItem;
        $scope.shared.blog.Logo = $scope.selected;
      } else if (callingFrom == 'blog-cover') {
        $scope.selected = selectedItem;
        $scope.shared.blog.Cover = $scope.selected;
      } else if (callingFrom == 'user-image') {
        $scope.selected = selectedItem;
        $scope.shared.user.Image = $scope.selected;
      } else if (callingFrom == 'user-cover') {
        $scope.selected = selectedItem;
        $scope.shared.user.Cover = $scope.selected;
      }
    });
  };
});

//empty modal window instance
adminApp.controller('EmptyModalInstanceCtrl', function ($scope, $http, $uibModalInstance, sharingService) {
  $scope.shared = sharingService.shared;
  $scope.ok = function () {
    $uibModalInstance.close();
  };
  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
});

//image modal window instance
adminApp.controller('ImageModalInstanceCtrl', function ($scope, $http, $uibModalInstance, sharingService) {
  $scope.shared = sharingService.shared;
  $scope.shared.selected = $scope.shared.infiniteScrollFactory.items[0];
  $scope.deleteImage = function (fileName) {
    if (confirm('Are you sure you want to delete this image?')) {
      $http.delete('/admin/api/image', {data: {Filename:fileName}}).then(function(data) {
        //delete image from array
        for (var i = 0; i < $scope.shared.infiniteScrollFactory.items.length; i++) {
          if($scope.shared.infiniteScrollFactory.items[i] == fileName) {
            $scope.shared.infiniteScrollFactory.items.splice(i, 1);
            //select first image again just to be save that there is an image selected that is available
            $scope.shared.selected = $scope.shared.infiniteScrollFactory.items[0];
            $('.imgselected').removeClass('imgselected');
            $('.firstimg').addClass('imgselected');
          }
        }
      }, function(error) { console.log(error) });
    }
  };
  $scope.ok = function () {
    $uibModalInstance.close($scope.shared.selected);
  };
  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
});
