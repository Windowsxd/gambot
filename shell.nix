{ pkgs ? import <nixpkgs> {} }:
pkgs.mkShell {
	buildInputs = with pkgs; [
		bun
		sqlite
 	];
  	shellHook = ''
		export LD_LIBRARY_PATH=${pkgs.lib.makeLibraryPath [
		pkgs.stdenv.cc.cc
		]}
	'';
}
