#!/usr/bin/env bash
# install.sh
set -e

CMD="$1"
ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)

function install() {
	echo "Installing Aegis Core Agent dependencies..."
	npm install

	echo "Linking package globally so 'aegis' command is available..."
	npm link

	# Set AEGIS_HOME environment variable for current user
	if [[ "$OS" == "Windows_NT" || "$(uname -s 2>/dev/null)" == *"NT"* ]]; then
		echo "Setting AEGIS_HOME (Windows)..."
		if command -v setx >/dev/null 2>&1; then
			setx AEGIS_HOME "$ROOT_DIR"
			echo "AEGIS_HOME set to $ROOT_DIR for current user. You may need to restart terminal."
		else
			echo "setx not found — please set AEGIS_HOME=$ROOT_DIR manually in System Environment Variables."
		fi
	else
		echo "Setting AEGIS_HOME (Unix)..."
		SHELL_RC="$HOME/.profile"
		if [ -n "$ZSH_VERSION" ]; then
			SHELL_RC="$HOME/.zshrc"
		fi
		if ! grep -q "AEGIS_HOME" "$SHELL_RC" 2>/dev/null; then
			echo "export AEGIS_HOME=\"$ROOT_DIR\"" >> "$SHELL_RC"
			echo "Added AEGIS_HOME to $SHELL_RC. Restart your shell to apply."
		else
			echo "AEGIS_HOME already set in $SHELL_RC"
		fi
	fi

	echo "Install complete. You can now run 'aegis configure' to configure the agent."
}

function uninstall() {
	echo "Unlinking global package..."
	npm unlink -g || true

	echo "Removing AEGIS_HOME environment variable (best-effort)..."
	if [[ "$OS" == "Windows_NT" || "$(uname -s 2>/dev/null)" == *"NT"* ]]; then
		if command -v setx >/dev/null 2>&1; then
			setx AEGIS_HOME ""
			echo "AEGIS_HOME cleared for current user. You may need to restart terminal."
		else
			echo "setx not found — please remove AEGIS_HOME from System Environment Variables manually."
		fi
	else
		SHELL_RC="$HOME/.profile"
		if [ -n "$ZSH_VERSION" ]; then
			SHELL_RC="$HOME/.zshrc"
		fi
		if grep -q "AEGIS_HOME" "$SHELL_RC" 2>/dev/null; then
			grep -v "AEGIS_HOME" "$SHELL_RC" > "$SHELL_RC.tmp" && mv "$SHELL_RC.tmp" "$SHELL_RC"
			echo "Removed AEGIS_HOME from $SHELL_RC"
		else
			echo "AEGIS_HOME not found in $SHELL_RC"
		fi
	fi

	echo "Uninstall complete."
}

case "$CMD" in
	install|--install)
		install
		;;
	uninstall|--uninstall)
		uninstall
		;;
	*)
		echo "Usage: $0 [install|uninstall]"
		echo "  install    - install dependencies, link CLI, set AEGIS_HOME"
		echo "  uninstall  - unlink CLI and remove AEGIS_HOME"
		exit 1
		;;
esac
